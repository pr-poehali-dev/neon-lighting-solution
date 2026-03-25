import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    """Авторизация: регистрация, вход, проверка токена, обновление профиля, выход"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Auth-Token', '')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')

    # GET — проверка токена /me
    if method == 'GET':
        if not token:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Нет токена'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT u.id, u.name, u.email, u.status, u.presence FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = %s AND s.expires_at > NOW()", (token,))
        user = cur.fetchone()
        conn.close()
        if not user:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Токен недействителен'})}
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': {'id': user[0], 'name': user[1], 'email': user[2], 'status': user[3], 'presence': user[4]}})}

    # PUT — обновление профиля
    if method == 'PUT':
        if not token:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Нет токена'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM sessions WHERE token = %s AND expires_at > NOW()", (token,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Токен недействителен'})}
        user_id = row[0]
        name = body.get('name')
        status = body.get('status')
        presence = body.get('presence')
        if name:
            cur.execute("UPDATE users SET name = %s WHERE id = %s", (name, user_id))
        if status is not None:
            cur.execute("UPDATE users SET status = %s WHERE id = %s", (status, user_id))
        if presence:
            cur.execute("UPDATE users SET presence = %s WHERE id = %s", (presence, user_id))
        cur.execute("SELECT id, name, email, status, presence FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': {'id': user[0], 'name': user[1], 'email': user[2], 'status': user[3], 'presence': user[4]}})}

    # POST — register / login / logout (роутим по action в теле)
    if method == 'POST':
        if action == 'logout':
            if token:
                conn = get_conn()
                cur = conn.cursor()
                cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = %s", (token,))
                conn.commit()
                conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if action == 'register':
            name = body.get('name', '').strip()
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            if not name or not email or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                conn.close()
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Email уже зарегистрирован'})}
            pw_hash = hash_password(password)
            cur.execute("INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email, status, presence", (name, email, pw_hash))
            user = cur.fetchone()
            session_token = secrets.token_hex(32)
            cur.execute("INSERT INTO sessions (user_id, token) VALUES (%s, %s)", (user[0], session_token))
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'token': session_token,
                'user': {'id': user[0], 'name': user[1], 'email': user[2], 'status': user[3], 'presence': user[4]}
            })}

        if action == 'login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("SELECT id, name, email, status, presence FROM users WHERE email = %s AND password_hash = %s", (email, hash_password(password)))
            user = cur.fetchone()
            if not user:
                conn.close()
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            session_token = secrets.token_hex(32)
            cur.execute("INSERT INTO sessions (user_id, token) VALUES (%s, %s)", (user[0], session_token))
            cur.execute("UPDATE users SET last_seen = NOW() WHERE id = %s", (user[0],))
            conn.commit()
            conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'token': session_token,
                'user': {'id': user[0], 'name': user[1], 'email': user[2], 'status': user[3], 'presence': user[4]}
            })}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}