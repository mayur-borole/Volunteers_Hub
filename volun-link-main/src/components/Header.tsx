import { Button } from "@/components/ui/button";
import { Heart, Users, Calendar } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">VolunLink</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#events" className="text-foreground hover:text-primary transition-smooth">
              Find Events
            </a>
            <a href="#organizers" className="text-foreground hover:text-primary transition-smooth">
              For Organizers
            </a>
            <a href="#about" className="text-foreground hover:text-primary transition-smooth">
              About
            </a>
          </nav>
          
          <div className="flex items-center space-x-3">
            <Button variant="ghost">Sign In</Button>
            <Button variant="hero">Get Started</Button>
          </div>
        </div>
      </div>
    </header>
  );
};