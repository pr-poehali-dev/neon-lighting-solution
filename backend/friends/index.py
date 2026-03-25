import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_id(token: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM sessions WHERE token = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    """Друзья: список, поиск, заявки, принять/отклонить"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Auth-Token', '')
    params = event.get('queryStringParameters') or {}

    user_id = get_user_id(token)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    # GET /friends — список друзей + входящие заявки + поиск пользователей
    if method == 'GET':
        conn = get_conn()
        cur = conn.cursor()

        search = params.get('search', '').strip()
        if search:
            cur.execute("SELECT id, name, email, status, presence FROM users WHERE (name ILIKE %s OR email ILIKE %s) AND id != %s LIMIT 20", (f'%{search}%', f'%{search}%', user_id))
            rows = cur.fetchall()
            conn.close()
            users = [{'id': r[0], 'name': r[1], 'email': r[2], 'status': r[3], 'presence': r[4]} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

        # Принятые друзья
        cur.execute("""
            SELECT u.id, u.name, u.status, u.presence
            FROM friendships f
            JOIN users u ON (CASE WHEN f.user_id = %s THEN f.friend_id ELSE f.user_id END) = u.id
            WHERE (f.user_id = %s OR f.friend_id = %s) AND f.status = 'accepted'
        """, (user_id, user_id, user_id))
        friends = [{'id': r[0], 'name': r[1], 'status': r[2], 'presence': r[3], 'online': r[3] == 'online'} for r in cur.fetchall()]

        # Входящие заявки
        cur.execute("""
            SELECT u.id, u.name FROM friendships f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_id = %s AND f.status = 'pending'
        """, (user_id,))
        requests = [{'id': r[0], 'name': r[1], 'avatar': r[1][0].upper()} for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'friends': friends, 'requests': requests})}

    # POST /friends — отправить заявку
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        friend_id = body.get('friend_id')
        if not friend_id or friend_id == user_id:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Некорректный friend_id'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id FROM friendships WHERE (user_id=%s AND friend_id=%s) OR (user_id=%s AND friend_id=%s)", (user_id, friend_id, friend_id, user_id))
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Заявка уже существует'})}
        cur.execute("INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'pending')", (user_id, friend_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    # PUT /friends — принять или отклонить заявку
    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        from_user_id = body.get('from_user_id')
        action = body.get('action')  # accept | reject
        if not from_user_id or action not in ('accept', 'reject'):
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Некорректные параметры'})}
        conn = get_conn()
        cur = conn.cursor()
        new_status = 'accepted' if action == 'accept' else 'rejected'
        cur.execute("UPDATE friendships SET status = %s WHERE user_id = %s AND friend_id = %s AND status = 'pending'", (new_status, from_user_id, user_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
