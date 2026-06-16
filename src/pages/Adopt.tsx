import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/ui/navbar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trackQuestProgress } from "@/lib/questTracker";
import petFluff from "@/assets/pet-fluff.png";
import petSpark from "@/assets/pet-spark.png";
import petAqua from "@/assets/pet-aqua.png";
import petTerra from "@/assets/pet-terra.png";
import petCloud from "@/assets/pet-cloud.png";

// Map for local images
const imageMap: Record<string, string> = {
  fluff: petFluff,
  spark: petSpark,
  aqua: petAqua,
  terra: petTerra,
  cloud: petCloud,
};

const Adopt = () => {
  const [species, setSpecies] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [petName, setPetName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSpecies = async () => {
      const { data, error } = await supabase
        .from("species_catalog")
        .select("*")
        .eq("is_active", true)
        .lt("unlock_level", 999);

      if (error) {
        toast.error("Error loading species: " + error.message);
      } else if (data) {
        setSpecies(data);
      }
    };

    fetchSpecies();
  }, []);

  const handleAdopt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSpecies || !petName) return;

    setLoading(true);
    try {
      const selectedSpec = species.find(s => s.id === selectedSpecies);
      const { error } = await supabase.from("pets").insert([
        {
          owner_id: user.id,
          name: petName,
          species: selectedSpecies,
          element: selectedSpec?.element || 'normal',
          hunger: 50,
          happiness: 50,
          health: 100,
          energy: 100,
        },
      ]);

      if (error) throw error;

      // Track quest progress for pet collection
      const { data: pets, count } = await supabase
        .from("pets")
        .select("id", { count: 'exact' })
        .eq("owner_id", user.id);

      if (count && count >= 3) {
        await trackQuestProgress(user.id, 'challenge', 1);
      }

      toast.success(`${petName} has joined your family!`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to adopt pet");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gradient mb-4">Adopt a Pet</h1>
            <p className="text-lg text-muted-foreground">
              Choose your new companion and give them a name
            </p>
          </div>

          <form onSubmit={handleAdopt} className="space-y-8">
            {/* Species Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-bold">Select a Species</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                {species.map((spec) => (
                  <Card
                    key={spec.id}
                    className={`p-3 md:p-4 cursor-pointer transition-smooth hover:shadow-lg ${
                      selectedSpecies === spec.id
                        ? "ring-2 ring-primary shadow-button"
                        : ""
                    }`}
                    onClick={() => setSelectedSpecies(spec.id)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedSpecies(spec.id);
                      }
                    }}
                    aria-pressed={selectedSpecies === spec.id}
                    aria-label={`Select ${spec.display_name} (${spec.element} element, ${spec.rarity} rarity)`}
                  >
                    <img
                      src={spec.image_url || imageMap[spec.id]}
                      alt={spec.display_name}
                      className="w-full h-24 md:h-32 object-contain mb-2"
                      loading="lazy"
                    />
                    <h3 className="font-bold text-center mb-1 text-sm md:text-base">{spec.display_name}</h3>
                    <p className="text-xs text-primary/80 text-center font-semibold mb-1">
                      {spec.element.charAt(0).toUpperCase() + spec.element.slice(1)}
                    </p>
                    <p className="text-xs text-muted-foreground text-center line-clamp-2">
                      {spec.description}
                    </p>
                    {spec.rarity !== 'common' && (
                      <p className="text-xs font-bold text-accent text-center mt-1">
                        {spec.rarity.toUpperCase()}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Pet Name */}
            <div className="space-y-2">
              <Label htmlFor="petName" className="text-lg font-bold">
                Name Your Pet
              </Label>
              <Input
                id="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Enter a name..."
                required
                maxLength={20}
                className="text-lg"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedSpecies || !petName || loading}
                className="flex-1 shadow-button"
              >
                {loading ? "Adopting..." : "Adopt Pet"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Adopt;
