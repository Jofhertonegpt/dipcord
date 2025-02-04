import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface UserListProps {
  users: User[] | undefined;
  selectedUser: string | null;
  onSelectUser: (userId: string) => void;
  isLoading: boolean;
}

export const UserList = ({ users, selectedUser, onSelectUser, isLoading }: UserListProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="space-y-2">
        {users?.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectUser(user.id)}
            className={`w-full p-2 flex items-center space-x-2 rounded-lg hover:bg-accent ${
              selectedUser === user.id ? "bg-accent" : ""
            }`}
          >
            <Avatar>
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{user.username}</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};