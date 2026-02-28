import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, TrendingUp, Plus, Star, Bell, Settings } from 'lucide-react';
import { dummyEvents, platformStats } from '@/utils/dummyData';

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <PageTransition>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Please Sign In</h1>
          <p className="text-muted-foreground mb-8">You need to be logged in to access the dashboard.</p>
          <Button variant="hero" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </PageTransition>
    );
  }

  const stats = [
    { label: 'Events Joined', value: 12, icon: Calendar, color: 'bg-primary' },
    { label: 'Hours Contributed', value: 48, icon: Clock, color: 'bg-secondary' },
    { label: 'Connections', value: 156, icon: Users, color: 'bg-accent' },
    { label: 'Rating', value: 4.9, icon: Star, color: 'bg-community-purple' },
  ];

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground capitalize">
              {user?.role} Dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            {user?.role === 'organizer' && (
              <Button variant="hero">
                <Plus className="h-5 w-5 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl p-5"
            >
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Recent Events */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Upcoming Events</h2>
            <Button variant="ghost" asChild>
              <Link to="/events">View All</Link>
            </Button>
          </div>
          <div className="space-y-4">
            {dummyEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <img src={event.image} alt={event.title} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.date} • {event.location}</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
