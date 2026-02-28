import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Filter, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTransition } from '@/components/ui/PageTransition';
import { StarRating } from '@/components/ui/StarRating';
import { Badge } from '@/components/ui/badge';
import { eventService, Event } from '@/services/eventService';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { connectSocket } from '@/lib/socket';

const Events = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedStatusByEvent, setAppliedStatusByEvent] = useState<Record<string, 'pending' | 'approved' | 'rejected' | 'cancelled'>>({});

  const categories = ['all', 'education', 'healthcare', 'environment', 'social welfare', 'disaster relief', 'other'];

  useEffect(() => {
    fetchEvents();

    const socket = connectSocket();
    const onRegistrationUpdated = () => {
      fetchEvents();
    };
    socket.on('registrationUpdated', onRegistrationUpdated);

    const intervalId = window.setInterval(() => {
      fetchEvents();
    }, 10000);

    const handleFocus = () => {
      fetchEvents();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      socket.off('registrationUpdated', onRegistrationUpdated);
    };
  }, [isAuthenticated, user?.role]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await eventService.getAllEvents({
        status: 'upcoming',
        limit: 100,
      });
      if (response.success) {
        setEvents(response.events || response.data?.events || []);
      }

      if (isAuthenticated && user?.role === 'volunteer') {
        const appliedResponse = await eventService.getAppliedEvents();
        const appliedEvents = appliedResponse?.events || [];
        const statusMap = appliedEvents.reduce((acc: Record<string, 'pending' | 'approved' | 'rejected' | 'cancelled'>, item: any) => {
          const status = item?.myRegistration?.status;
          if (item?._id && (status === 'pending' || status === 'approved' || status === 'rejected' || status === 'cancelled')) {
            acc[item._id] = status;
          }
          return acc;
        }, {});
        setAppliedStatusByEvent(statusMap);
      } else {
        setAppliedStatusByEvent({});
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };
  
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find Events</h1>
          <p className="text-muted-foreground">Browse and discover volunteer events — open to everyone</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No events found</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && filteredEvents.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              (() => {
                const cardImage = [
                  event.imageUrl,
                  ...(event.images || []),
                ]
                  .map((image) => (typeof image === 'string' ? image.trim() : ''))
                  .find((image) => image.length > 0);

                const registrationStatus = appliedStatusByEvent[event._id];
                const isApplied = Boolean(registrationStatus);

                return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/events/${event._id}`)}
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                  {cardImage ? (
                    <img
                      src={cardImage}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  <Badge className="absolute top-3 left-3" variant={event.status === 'upcoming' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                  <Badge className="absolute top-3 right-3 bg-background/90 text-foreground">
                    {event.category}
                  </Badge>
                </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-foreground mb-2">{event.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{event.volunteers?.length || 0}/{event.maxVolunteers} volunteers</span>
                  </div>
                </div>
                {event.averageRating > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <StarRating rating={event.averageRating} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      ({event.totalRatings} {event.totalRatings === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <span className="text-xs text-muted-foreground">
                    Organized by {event.organizer.name}
                  </span>
                  <Button 
                    variant={isApplied ? 'outline' : 'default'}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events/${event._id}`);
                    }}
                  >
                    {registrationStatus === 'pending'
                      ? 'Application Pending'
                      : registrationStatus === 'approved'
                      ? 'Approved'
                      : registrationStatus === 'rejected'
                      ? 'Rejected - Reapply'
                      : registrationStatus === 'cancelled'
                      ? 'Cancelled'
                      : 'View Details & Register'}
                  </Button>
                </div>
              </div>
            </motion.div>
                );
              })()
          ))}
        </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Events;