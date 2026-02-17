import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────
export interface RoomMember {
  id: string;
  name: string;
  role: "lead" | "member";
  verified: boolean;
  dealCount: number;
  addedAt: string;
}

export interface RoomMessage {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  verified: boolean;
}

export interface RoomDeal {
  id: string;
  name: string;
  stage: string;
  sector: string;
}

export interface RoomEvent {
  id: string;
  title: string;
  date: string;
  type: "ic_review" | "presentation" | "call" | "other";
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isVerified: boolean;
  trustScore: number;
  members: RoomMember[];
  deals: RoomDeal[];
  messages: RoomMessage[];
  events: RoomEvent[];
  createdAt: string;
  lastActivity: string;
}

const INTEGRATION_TYPE = "deal_rooms";

function generateId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useRooms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: row, isLoading } = useQuery({
    queryKey: ["rooms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("integration_type", INTEGRATION_TYPE)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const rooms: Room[] = (row?.config as { rooms?: Room[] })?.rooms ?? [];

  const saveMutation = useMutation({
    mutationFn: async (updatedRooms: Room[]) => {
      const { error } = await supabase
        .from("integration_settings")
        .upsert(
          {
            user_id: user!.id,
            integration_type: INTEGRATION_TYPE,
            enabled: true,
            config: { rooms: updatedRooms },
          },
          { onConflict: "user_id,integration_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", user?.id] });
    },
  });

  const createRoom = async (data: { name: string; description: string; isPrivate: boolean }) => {
    const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "You";
    const newRoom: Room = {
      id: generateId(),
      name: data.name,
      description: data.description,
      isPrivate: data.isPrivate,
      isVerified: false,
      trustScore: 75,
      members: [
        {
          id: user!.id,
          name: userName,
          role: "lead",
          verified: true,
          dealCount: 0,
          addedAt: new Date().toISOString(),
        },
      ],
      deals: [],
      messages: [],
      events: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    await saveMutation.mutateAsync([...rooms, newRoom]);
    toast.success("Room created", { description: data.name });
    return newRoom;
  };

  const deleteRoom = async (roomId: string) => {
    const updated = rooms.filter((r) => r.id !== roomId);
    await saveMutation.mutateAsync(updated);
    toast.success("Room deleted");
  };

  const updateRoom = async (roomId: string, updates: Partial<Room>) => {
    const updated = rooms.map((r) =>
      r.id === roomId ? { ...r, ...updates, lastActivity: new Date().toISOString() } : r
    );
    await saveMutation.mutateAsync(updated);
  };

  const addMessage = async (roomId: string, content: string) => {
    const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "You";
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const message: RoomMessage = {
      id: `msg_${Date.now()}`,
      author: userName,
      content,
      createdAt: new Date().toISOString(),
      verified: true,
    };
    await updateRoom(roomId, { messages: [...room.messages, message] });
  };

  const addMember = async (roomId: string, name: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const member: RoomMember = {
      id: `mem_${Date.now()}`,
      name,
      role: "member",
      verified: false,
      dealCount: 0,
      addedAt: new Date().toISOString(),
    };
    await updateRoom(roomId, { members: [...room.members, member] });
    toast.success("Member invited", { description: name });
  };

  const addEvent = async (roomId: string, data: { title: string; date: string; type: RoomEvent["type"] }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const event: RoomEvent = {
      id: `evt_${Date.now()}`,
      title: data.title,
      date: data.date,
      type: data.type,
      createdAt: new Date().toISOString(),
    };
    await updateRoom(roomId, { events: [...room.events, event] });
    toast.success("Event scheduled", { description: data.title });
  };

  const addDeal = async (roomId: string, deal: RoomDeal) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    await updateRoom(roomId, { deals: [...room.deals, deal] });
  };

  const getRoomById = (roomId: string): Room | undefined => rooms.find((r) => r.id === roomId);

  return {
    rooms,
    isLoading,
    isSaving: saveMutation.isPending,
    createRoom,
    deleteRoom,
    updateRoom,
    addMessage,
    addMember,
    addEvent,
    addDeal,
    getRoomById,
  };
}
