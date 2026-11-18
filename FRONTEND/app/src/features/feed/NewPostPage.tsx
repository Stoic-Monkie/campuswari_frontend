import { useNavigate } from "react-router-dom";
import { Composer } from "./Composer";

/** Full-screen composer, reached from the bottom navigation on phones. */
export function NewPostPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">New post</h1>
      <Composer autoFocus onPosted={() => navigate("/")} />
    </div>
  );
}
