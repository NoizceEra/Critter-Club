import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Plus, Coins } from "lucide-react";
import { toast } from "sonner";
import petFluff from "@/assets/pet-fluff.png";
import petSpark from "@/assets/pet-spark.png";
import petAqua from "@/assets/pet-aqua.png";
import petTerra from "@/assets/pet-terra.png";
import petCloud from "@/assets/pet-cloud.png";

const petImages: Record<string, string> = {
  fluff: petFluff,
  spark: petSpark,
  aqua: petAqua,
  terra: petTerra,
  cloud: petCloud,
};

interface Pet {
  id: string;
  name: string;
  species: string;
  level: number;
  hunger: number;
  happiness: number;
  health: number;
  energy: number;
}

interface Profile {
  pet_points: number;
  username: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch pets
        const { data: petsData, error: petsError } = await supabase
          .from("pets")
          .select("*")
          .eq("owner_id", user.id);

        if (petsError) throw petsError;
        setPets(petsData || []);
      } catch (error: any) {
        toast.error(error.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">My Pets</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Welcome back, {profile?.username || "Trainer"}!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full justify-center sm:justify-start">
              <Coins className="w-5 h-5 text-accent flex-shrink-0" />
              <span className="font-bold text-sm md:text-base">{profile?.pet_points || 0} PP</span>
            </div>
            <Link to="/adopt" className="w-full sm:w-auto">
              <Button className="shadow-button w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Adopt Pet</span>
                <span className="sm:hidden">Adopt</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Pets Grid */}
        {pets.length === 0 ? (
          <Card className="p-12 text-center shadow-card">
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-bold mb-4">No Pets Yet!</h3>
              <p className="text-muted-foreground mb-6">
                Adopt your first pet to begin your adventure in Critter Club
              </p>
              <Link to="/adopt">
                <Button size="lg" className="shadow-button">
                  <Plus className="w-5 h-5 mr-2" />
                  Adopt Your First Pet
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pets.map((pet) => (
              <Link key={pet.id} to={`/pet/${pet.id}`}>
                <Card className="p-6 hover:shadow-lg transition-smooth cursor-pointer gradient-card">
                  <div className="flex flex-col items-center">
                    <img
                      src={petImages[pet.species]}
                      alt={pet.name}
                      className="w-32 h-32 object-contain mb-4"
                    />
                    <h3 className="text-xl font-bold mb-2">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 capitalize">
                      {pet.species} • Level {pet.level}
                    </p>
                    <div className="w-full space-y-2">
                      <StatBar label="Hunger" value={pet.hunger} color="stat-hunger" />
                      <StatBar label="Happy" value={pet.happiness} color="stat-happiness" />
                      <StatBar label="Health" value={pet.health} color="stat-health" />
                      <StatBar label="Energy" value={pet.energy} color="stat-energy" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

const StatBar = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor: `hsl(var(--${color}))`,
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;

