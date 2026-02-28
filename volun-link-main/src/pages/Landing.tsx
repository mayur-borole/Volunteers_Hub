import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Users, 
  Calendar, 
  Shield, 
  Bell, 
  Star, 
  Search, 
  ArrowRight, 
  CheckCircle,
  MapPin,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { PageTransition } from '@/components/ui/PageTransition';
import { platformStats, dummyEvents } from '@/utils/dummyData';
import { eventService, Event } from '@/services/eventService';

const features = [
  {
    icon: Search,
    title: 'Event Discovery',
    description: 'Find volunteer opportunities that match your skills and interests with our smart filtering system.',
  },
  {
    icon: Users,
    title: 'Skill-Based Matching',
    description: 'Get personalized event suggestions based on your expertise and availability.',
  },
  {
    icon: Shield,
    title: 'Secure Platform',
    description: 'Your data is protected with enterprise-grade security and encryption.',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description: 'Stay updated with instant alerts about events, registrations, and community updates.',
  },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Volunteer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    quote: 'Helping Hands helped me find meaningful volunteer work that fits my schedule. The platform is incredibly easy to use!',
  },
  {
    name: 'Rahul Kumar',
    role: 'Event Organizer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    quote: 'Managing volunteers has never been easier. The dashboard gives me everything I need at a glance.',
  },
  {
    name: 'Ananya Patel',
    role: 'Volunteer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    quote: 'I\'ve contributed over 60 hours through Helping Hands. It\'s rewarding to see the impact we\'re making together.',
  },
];

const Landing = () => {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const resp = await eventService.getAllEvents({ status: 'upcoming', limit: 3, sort: 'date', approved: 'true' });
        const list = resp?.events || resp?.data?.events || [];
        setFeaturedEvents(list);
      } catch (error) {
        // fallback to dummyEvents via render logic
        setFeaturedEvents([]);
      }
    };

    fetchEvents();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <PageTransition>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-hero opacity-10 dark:opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Heart className="h-4 w-4" />
                Community Service Management System
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Connecting Volunteers with{' '}
                <span className="gradient-text">Meaningful Community Impact</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg">
                Join thousands of volunteers and organizers creating positive change. 
                Find events, track contributions, and make a difference together.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/register">
                    Join as Volunteer
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/register?role=organizer">Create an Event</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/events">
                    <Search className="mr-2 h-5 w-5" />
                    Find Events
                  </Link>
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                {[
                  { label: 'Active Volunteers', value: platformStats.totalVolunteers },
                  { label: 'Events Completed', value: platformStats.eventsCompleted },
                  { label: 'Hours Contributed', value: platformStats.hoursContributed },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      <AnimatedCounter target={stat.value} suffix="+" />
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Content - Event Cards Preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className="relative">
                {/* Floating Cards */}
                {(featuredEvents.length ? featuredEvents : dummyEvents.slice(0, 3)).map((event: any, index) => {
                  const cardImage = event.imageUrl || event.images?.[0] || event.image;
                  const title = event.title || event.name;
                  const location = event.location || event.address?.city || 'Location TBA';
                  const dateLabel = event.date
                    ? new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : event.dateLabel || 'Date TBA';

                  return (
                  <motion.div
                    key={event._id || event.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.15 }}
                    className={`glass-card rounded-2xl p-4 shadow-elegant mb-4 ${
                      index === 0 ? 'ml-0' : index === 1 ? 'ml-8' : 'ml-4'
                    }`}
                    style={{ 
                      animation: `float ${3 + index * 0.5}s ease-in-out infinite`,
                      animationDelay: `${index * 0.2}s`
                    }}
                  >
                    <div className="flex gap-4">
                      <img
                        src={cardImage}
                        alt={title}
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4" />
                          <span>{dateLabel}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Make an Impact</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform provides all the tools volunteers and organizers need to connect, 
              collaborate, and create positive change in communities.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                className="glass-card rounded-2xl p-6 text-center group cursor-pointer"
              >
                <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-elegant transition-shadow">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in just a few simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up as a volunteer or organizer in minutes' },
              { step: '02', title: 'Find Events', desc: 'Browse and filter events based on your interests' },
              { step: '03', title: 'Make Impact', desc: 'Register, participate, and track your contributions' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center relative"
              >
                <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                <h3 className="font-semibold text-xl text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 text-primary/30">
                    <ArrowRight className="h-8 w-8" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Our Community Says
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from volunteers and organizers who are making a difference
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.name}
                variants={itemVariants}
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-gradient-hero rounded-3xl p-12 md:p-16 text-center text-white overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Make a Difference?
              </h2>
              <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
                Join our community of volunteers and organizers today. 
                Together, we can create positive change in communities across the nation.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
                  <Link to="/register">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                  <Link to="/events">Browse Events</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
};

export default Landing;
