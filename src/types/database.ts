export interface TurnServer {
  id: string;
  url: string;
  username?: string;
  credential?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoipSession {
  id: string;
  channel_id: string;
  user_id: string;
  connection_state: 'disconnected' | 'connecting' | 'connected';
  is_muted: boolean;
  is_deafened: boolean;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

export interface VoipSignal {
  id: string;
  session_id: string;
  sender_id: string;
  receiver_id?: string;
  type: string;
  payload: any;
  created_at: string;
  expires_at: string;
}