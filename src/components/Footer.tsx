import { Bug } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 py-8 px-6">
    <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Bug className="h-4 w-4 text-neon-purple" />
        <span className="gradient-text font-semibold">Bug Digger</span>
      </div>
      <p>© {new Date().getFullYear()} Bug Digger. Built for learners.</p>
    </div>
  </footer>
);

export default Footer;
