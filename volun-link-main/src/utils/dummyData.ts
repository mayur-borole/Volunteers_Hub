export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  volunteersNeeded: number;
  volunteersRegistered: number;
  organizer: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  image: string;
  rating?: number;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  skills: string[];
  eventsAttended: number;
  hoursContributed: number;
  rating: number;
  joinedDate: string;
}

export interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export const dummyEvents: Event[] = [
  {
    id: '1',
    title: 'Beach Cleanup Drive',
    description: 'Join us for a community beach cleanup to protect marine life and keep our beaches beautiful.',
    date: '2026-02-15',
    time: '08:00 AM',
    location: 'Marina Beach, Chennai',
    category: 'Environment',
    volunteersNeeded: 50,
    volunteersRegistered: 35,
    organizer: 'Green Earth Foundation',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800',
    rating: 4.5,
  },
  {
    id: '2',
    title: 'Teaching Digital Literacy',
    description: 'Help underprivileged students learn basic computer skills and internet safety.',
    date: '2026-02-20',
    time: '10:00 AM',
    location: 'Community Center, Mumbai',
    category: 'Education',
    volunteersNeeded: 20,
    volunteersRegistered: 18,
    organizer: 'Tech for All',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
    rating: 4.8,
  },
  {
    id: '3',
    title: 'Blood Donation Camp',
    description: 'Save lives by donating blood. Every drop counts!',
    date: '2026-02-25',
    time: '09:00 AM',
    location: 'City Hospital, Delhi',
    category: 'Healthcare',
    volunteersNeeded: 30,
    volunteersRegistered: 28,
    organizer: 'Red Cross Society',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
    rating: 4.9,
  },
  {
    id: '4',
    title: 'Tree Plantation Drive',
    description: 'Plant trees and contribute to a greener future for our community.',
    date: '2026-01-10',
    time: '07:00 AM',
    location: 'Central Park, Bangalore',
    category: 'Environment',
    volunteersNeeded: 100,
    volunteersRegistered: 100,
    organizer: 'Green Warriors',
    status: 'completed',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    rating: 4.7,
  },
  {
    id: '5',
    title: 'Food Distribution Drive',
    description: 'Help distribute food to homeless and underprivileged communities.',
    date: '2026-03-01',
    time: '06:00 PM',
    location: 'Railway Station, Kolkata',
    category: 'Social Welfare',
    volunteersNeeded: 40,
    volunteersRegistered: 25,
    organizer: 'Feeding Hope',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
    rating: 4.6,
  },
  {
    id: '6',
    title: 'Senior Citizens Tech Help',
    description: 'Assist elderly citizens in learning to use smartphones and digital payments.',
    date: '2026-03-05',
    time: '03:00 PM',
    location: 'Community Hall, Pune',
    category: 'Education',
    volunteersNeeded: 15,
    volunteersRegistered: 10,
    organizer: 'Digital Bridge',
    status: 'upcoming',
    image: 'https://images.unsplash.com/photo-1516733968668-dbdce39c0651?w=800',
    rating: 4.4,
  },
];

export const dummyVolunteers: Volunteer[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    skills: ['Teaching', 'Communication', 'Leadership'],
    eventsAttended: 12,
    hoursContributed: 48,
    rating: 4.9,
    joinedDate: '2025-01-15',
  },
  {
    id: '2',
    name: 'Rahul Kumar',
    email: 'rahul@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    skills: ['First Aid', 'Driving', 'Organization'],
    eventsAttended: 8,
    hoursContributed: 32,
    rating: 4.7,
    joinedDate: '2025-03-20',
  },
  {
    id: '3',
    name: 'Ananya Patel',
    email: 'ananya@example.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    skills: ['Gardening', 'Photography', 'Social Media'],
    eventsAttended: 15,
    hoursContributed: 60,
    rating: 4.8,
    joinedDate: '2024-11-10',
  },
];

export const dummyFeedback: Feedback[] = [
  {
    id: '1',
    eventId: '4',
    userId: '1',
    userName: 'Priya Sharma',
    rating: 5,
    comment: 'Amazing experience! The organization was excellent and everyone was so supportive.',
    date: '2026-01-11',
  },
  {
    id: '2',
    eventId: '4',
    userId: '2',
    userName: 'Rahul Kumar',
    rating: 4,
    comment: 'Great initiative. Would love to participate in more such events.',
    date: '2026-01-11',
  },
];

export const platformStats = {
  totalVolunteers: 15420,
  eventsCompleted: 892,
  hoursContributed: 45680,
  communitiesServed: 156,
};
