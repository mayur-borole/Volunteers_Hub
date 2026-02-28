import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Calendar, Heart } from "lucide-react";
import heroImage from "@/assets/hero-community.jpg";

export const Hero = () => {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Connect with
                <span className="bg-gradient-primary bg-clip-text text-transparent"> Community</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Join thousands of volunteers making a difference. Find meaningful opportunities, organize impactful events, and build stronger communities together.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="text-lg">
                Find Opportunities
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg">
                Organize Events
              </Button>
            </div>
            
            <div className="flex items-center space-x-8 pt-8">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-community-blue" />
                <span className="text-sm text-muted-foreground">10,000+ Volunteers</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-community-green" />
                <span className="text-sm text-muted-foreground">500+ Events</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-community-orange" />
                <span className="text-sm text-muted-foreground">50+ Cities</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl transform rotate-3 opacity-20"></div>
            <img
              src={heroImage}
              alt="Community volunteers working together"
              className="relative rounded-3xl shadow-elegant object-cover w-full h-[500px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};