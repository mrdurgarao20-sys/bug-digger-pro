import { Link } from "react-router-dom";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-neon-purple" />
          <span className="text-xl font-bold gradient-text">Bug Digger</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Help
          </Button>
          <Link to="/auth">
            <Button size="sm" className="neon-button-purple rounded-lg px-5 py-2 text-sm">
              Login / Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
