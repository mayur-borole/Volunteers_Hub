import { Button } from "@/components/ui/button";
import { ArrowRight, Heart } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex justify-center">
            <div className="bg-white/20 p-4 rounded-full">
              <Heart className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl lg:text-5xl font-bold text-white">
            Ready to make a difference?
          </h2>
          
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join our community of changemakers. Whether you're looking to volunteer or organize events, VolunLink makes it easy to create positive impact.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="accent" size="lg" className="text-lg">
              Start Volunteering
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg bg-white/10 border-white/30 text-white hover:bg-white/20">
              Organize Events
            </Button>
          </div>
          
          <p className="text-sm text-white/70">
            Join 10,000+ volunteers already making an impact
          </p>
        </div>
      </div>
    </section>
  );
};