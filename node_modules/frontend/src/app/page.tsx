'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
  Shield,
  GraduationCap,
  Clock,
  Star,
  Zap
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Sparkles,
      title: 'Time-Based Currency',
      description: 'Earn credits by teaching. Spend them to learn. No money changes hands.',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: Users,
      title: 'Peer-to-Peer Learning',
      description: 'Connect directly with fellow students who have the skills you need.',
      color: 'from-violet-500 to-indigo-500',
    },
    {
      icon: Calendar,
      title: 'Flexible Scheduling',
      description: 'Book sessions that fit your schedule. Learn at your own pace.',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: Shield,
      title: 'Secure Transactions',
      description: 'Atomic credit transfers ensure fair exchange for every session.',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  const stats = [
    { value: '5', label: 'Free Credits on Signup' },
    { value: '10+', label: 'Skill Categories' },
    { value: '24/7', label: 'Available Anytime' },
    { value: '100%', label: 'Peer Powered' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              The Knowledge Economy for Students
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              Trade Knowledge,{' '}
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Not Money
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              SkillVault is a peer-to-peer platform where students exchange skills using time-based credits.
              Teach React for an hour, earn credits, then learn calculus from someone else.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto">
                    Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto">
                      Start Trading Skills <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How SkillVault Works
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A simple, fair, and secure way to exchange knowledge with your peers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="relative group p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Started in Minutes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="text-8xl font-bold text-gray-800 absolute -top-8 -left-4">1</div>
              <div className="relative z-10 p-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center mb-4">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Sign Up & List Skills</h3>
                <p className="text-gray-400">
                  Create your profile and list the skills you can teach. Get 5 free credits to start.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="text-8xl font-bold text-gray-800 absolute -top-8 -left-4">2</div>
              <div className="relative z-10 p-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Find & Book Tutors</h3>
                <p className="text-gray-400">
                  Browse the marketplace, find tutors for skills you want to learn, and book sessions.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="text-8xl font-bold text-gray-800 absolute -top-8 -left-4">3</div>
              <div className="relative z-10 p-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Learn & Earn</h3>
                <p className="text-gray-400">
                  Complete sessions to exchange credits. Teach to earn, learn to grow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-violet-600/20 via-indigo-600/20 to-cyan-600/20 border border-violet-500/20">
            <Star className="w-12 h-12 text-amber-400 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Start Trading?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join SkillVault today and unlock the power of peer-to-peer learning.
              Your knowledge is valuable—start trading it.
            </p>
            {!isAuthenticated && (
              <Link href="/register">
                <Button size="lg">
                  Create Free Account <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">SkillVault</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 SkillVault. Built for Build2Break.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
