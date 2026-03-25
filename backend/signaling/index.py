import json
import os
import psycopg2
import time

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
    """WebRTC сигнализация: обмен offer/answer/ice между пользователями через БД"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = event.get('headers', {}).get('X-Auth-Token', '')
    params = event.get('queryStringParameters') or {}

    user_id = get_user_id(token)
    if not user_id:
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    # GET /signaling?peer=<id>&since=<ts> — получить сигналы для себя
    if method == 'GET':
        peer_id = params.get('peer')
        since = params.get('since', '0')
        if not peer_id:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите peer'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, sender_id, type, payload, created_at
            FROM webrtc_signals
            WHERE receiver_id = %s AND sender_id = %s AND id > %s
            ORDER BY id ASC LIMIT 20
        """, (user_id, int(peer_id), int(since)))
        rows = cur.fetchall()
        conn.close()
        signals = [{'id': r[0], 'sender_id': r[1], 'type': r[2], 'payload': r[3]} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'signals': signals})}

    # POST /signaling — отправить сигнал
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        peer_id = body.get('peer_id')
        sig_type = body.get('type')  # offer | answer | ice-candidate | hangup
        payload = body.get('payload', '')
        if not peer_id or not sig_type:
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Укажите peer_id и type'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO webrtc_signals (sender_id, receiver_id, type, payload) VALUES (%s, %s, %s, %s) RETURNING id", (user_id, peer_id, sig_type, payload))
        sig_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': sig_id})}

    return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
