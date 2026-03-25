import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    """Сообщения: получение и отправка личных сообщений между пользователями"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Auth-Token', '')
    params = event.get('queryStringParameters') or {}

    user_id = get_user_id(token)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    # GET /messages?with=<user_id> — получить переписку
    if method == 'GET':
        with_user = params.get('with')
        if not with_user:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите with'})}
        with_user = int(with_user)
        offset = int(params.get('offset', 0))
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT m.id, m.sender_id, u.name, m.text, m.created_at
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE (m.sender_id = %s AND m.receiver_id = %s)
               OR (m.sender_id = %s AND m.receiver_id = %s)
            ORDER BY m.created_at ASC
            LIMIT 50 OFFSET %s
        """, (user_id, with_user, with_user, user_id, offset))
        rows = cur.fetchall()
        conn.close()
        msgs = [{'id': r[0], 'sender_id': r[1], 'sender_name': r[2], 'text': r[3], 'time': r[4].strftime('%H:%M'), 'mine': r[1] == user_id} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': msgs})}

    # POST /messages — отправить сообщение
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        receiver_id = body.get('receiver_id')
        text = body.get('text', '').strip()
        if not receiver_id or not text:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите receiver_id и text'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO messages (sender_id, receiver_id, text) VALUES (%s, %s, %s) RETURNING id, created_at", (user_id, receiver_id, text))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': row[0], 'time': row[1].strftime('%H:%M')})}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
