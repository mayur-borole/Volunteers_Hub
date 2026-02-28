import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';
import { Heart, Target, Users, Award } from 'lucide-react';

const About = () => {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-bold mb-4">About <span className="gradient-text">Helping Hands</span></h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A secure and efficient platform connecting volunteers with meaningful community service opportunities.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: Heart, title: 'Our Mission', desc: 'To connect passionate volunteers with impactful community service opportunities.' },
            { icon: Target, title: 'Our Vision', desc: 'A world where everyone can easily contribute to their communities.' },
            { icon: Users, title: 'Community', desc: 'Building bridges between volunteers, organizers, and communities.' },
            { icon: Award, title: 'Impact', desc: 'Tracking and celebrating every contribution made by our volunteers.' },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <item.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Built for College Evaluation</h2>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            Helping Hands demonstrates full-stack web development using React, Tailwind CSS, and modern best practices.
            Features include role-based authentication, real-time notifications, feedback systems, and responsive design.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default About;
