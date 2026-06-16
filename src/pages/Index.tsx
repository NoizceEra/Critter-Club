import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { SignInForm } from "@/components/auth/SignInForm";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, Heart, Store, Star } from "lucide-react";
import { Footer } from "@/components/ui/footer";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const { user } = useAuth();
  const [showSignUp, setShowSignUp] = useState(true);

  if (user) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 gradient-hero opacity-20"
            style={{
              background: `url(${heroBanner}) no-repeat center center`,
              backgroundSize: "cover",
            }}
          />
          <div className="container mx-auto px-4 py-24 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Welcome to Critter Club!
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              Your magical world of adorable virtual pets awaits
            </p>
            <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <Link to="/dashboard">
                <Button size="lg" className="shadow-button">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
              <Link to="/shop">
                <Button size="lg" variant="outline">
                  <Store className="w-5 h-5 mr-2" />
                  Visit Shop
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What Makes Critter Club Special
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Heart className="w-8 h-8 text-secondary" />}
                title="Care for Your Pets"
                description="Feed, play, groom, and rest your pets to keep them happy and healthy"
              />
              <FeatureCard
                icon={<Store className="w-8 h-8 text-primary" />}
                title="Shop for Items"
                description="Buy food, toys, and accessories with PetPoints you earn"
              />
              <FeatureCard
                icon={<Star className="w-8 h-8 text-accent" />}
                title="Level Up & Customize"
                description="Watch your pets grow and customize them with unique colors and items"
              />
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Hero Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-1000">
          <div className="inline-block">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm md:text-base">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>Start Your Adventure</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gradient leading-tight">
            Welcome to Critter Club
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Adopt, care for, and love adorable virtual pets in this magical world. Feed them, play
            with them, and watch them grow!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">5 Unique Species</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-sm font-medium">Tons of Items</span>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="animate-in fade-in slide-in-from-right-4 duration-1000">
          {showSignUp ? (
            <SignUpForm onToggle={() => setShowSignUp(false)} />
          ) : (
            <SignInForm onToggle={() => setShowSignUp(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="gradient-card p-6 rounded-2xl shadow-card hover:shadow-lg transition-smooth">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;

