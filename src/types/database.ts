export interface TurnServer {
  id: string;
  url: string;
  username?: string | null;
  credential?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoipSession {
  id: string;
  channel_id: string;
  user_id: string;
  connection_state: string;
  is_muted: boolean;
  is_deafened: boolean;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceSignal {
  id: string;
  channel_id: string;
  sender_id: string;
  receiver_id?: string | null;
  type: string;
  payload: any;
  created_at: string;
  ice_candidate?: any;
  sdp?: any;
}

export interface VoiceParticipant {
  id: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  is_muted: boolean;
  is_deafened: boolean;
  connection_state: string;
}