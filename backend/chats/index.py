import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    """Список чатов пользователя — последнее сообщение с каждым собеседником"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    token = event.get('headers', {}).get('X-Auth-Token', '')
    user_id = get_user_id(token)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT ON (partner_id)
            partner_id,
            partner_name,
            partner_presence,
            last_msg,
            last_time
        FROM (
            SELECT
                CASE WHEN m.sender_id = %s THEN m.receiver_id ELSE m.sender_id END AS partner_id,
                CASE WHEN m.sender_id = %s THEN ru.name ELSE su.name END AS partner_name,
                CASE WHEN m.sender_id = %s THEN ru.presence ELSE su.presence END AS partner_presence,
                m.text AS last_msg,
                m.created_at AS last_time
            FROM messages m
            JOIN users su ON su.id = m.sender_id
            JOIN users ru ON ru.id = m.receiver_id
            WHERE m.sender_id = %s OR m.receiver_id = %s
        ) t
        ORDER BY partner_id, last_time DESC
    """, (user_id, user_id, user_id, user_id, user_id))
    rows = cur.fetchall()

    chats = sorted([{
        'id': r[0],
        'name': r[1],
        'avatar': r[1][0].upper() if r[1] else '?',
        'online': r[2] == 'online',
        'msg': r[3],
        'time': r[4].strftime('%H:%M') if r[4] else ''
    } for r in rows], key=lambda x: x['time'], reverse=True)

    conn.close()
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'chats': chats})}
