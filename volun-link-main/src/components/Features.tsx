import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Shield, Award, Bell, BarChart } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Secure authentication with tailored experiences for volunteers, organizers, and administrators."
    },
    {
      icon: Calendar,
      title: "Event Management",
      description: "Create, manage, and track community service events with intuitive tools and real-time updates."
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Enterprise-grade security with JWT authentication, encrypted data, and privacy protection."
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Stay informed with real-time alerts for event updates, registrations, and important announcements."
    },
    {
      icon: Award,
      title: "Impact Tracking",
      description: "Track volunteer hours, measure community impact, and celebrate achievements with detailed analytics."
    },
    {
      icon: BarChart,
      title: "Analytics Dashboard",
      description: "Comprehensive insights for organizers and admins to optimize events and engagement."
    }
  ];

  return (
    <section className="py-20 bg-community-light-blue/30" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Everything you need to make an impact
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to connect communities and amplify social good
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-soft hover:shadow-elegant transition-smooth bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <div className="bg-gradient-primary p-3 rounded-lg w-fit">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};