import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";
import { Progress } from "@/components/ui/progress";
import { UtensilsCrossed, Gamepad2, Sparkles, Moon, ArrowLeft, Palette, Package, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trackQuestProgress } from "@/lib/questTracker";
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
  experience: number;
  color: string;
}

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  shop_items: {
    name: string;
    effect_type: string | null;
    effect_value: number | null;
    category: string;
  };
}

const petColors = [
  { value: "blue", label: "Blue" },
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "pink", label: "Pink" },
];

const PetDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingPrice, setListingPrice] = useState("");
  const [isListing, setIsListing] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [isAlreadyListed, setIsAlreadyListed] = useState(false);

  useEffect(() => {
    if (!user || !id) {
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      const { data: petData, error: petError } = await supabase
        .from("pets")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .single();

      if (petError || !petData) {
        toast.error("Pet not found");
        navigate("/dashboard");
        return;
      }

      const { data: inventoryData } = await supabase
        .from("inventory")
        .select(`
          id,
          item_id,
          quantity,
          shop_items (
            name,
            effect_type,
            effect_value,
            category
          )
        `)
        .eq("user_id", user.id);

      // Check if pet is already listed
      const { data: listingData } = await supabase
        .from("marketplace_listings")
        .select("id")
        .eq("pet_id", id)
        .eq("status", "active")
        .single();

      // Get user points
      const { data: profileData } = await supabase
        .from("profiles")
        .select("pet_points")
        .eq("id", user.id)
        .single();

      setPet(petData);
      setInventory(inventoryData || []);
      setIsAlreadyListed(!!listingData);
      setUserPoints(profileData?.pet_points || 0);
      setLoading(false);
    };

    fetchData();
  }, [id, user, navigate]);

  const handleAction = async (
    action: "feed" | "play" | "groom" | "rest",
    stat: keyof Pet,
    change: number,
    cost: number = 0
  ) => {
    if (!pet) return;

    const newValue = Math.min(100, Math.max(0, pet[stat] as number + change));
    const updates: any = { [stat]: newValue };

    // Add experience
    updates.experience = pet.experience + 10;
    if (updates.experience >= 100 * pet.level) {
      updates.level = pet.level + 1;
      updates.experience = 0;
      
      // Track quest progress for level up
      if (user) {
        await trackQuestProgress(user.id, 'challenge', 1);
      }
      
      toast.success(`${pet.name} leveled up to ${pet.level + 1}!`);
    }

    const { error } = await supabase.from("pets").update(updates).eq("id", pet.id);

    if (error) {
      toast.error("Action failed");
      return;
    }

    // Track quest progress for pet care actions
    if (user) {
      await trackQuestProgress(user.id, 'pet_care');
    }

    // Update profile points if cost
    if (cost > 0 && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pet_points")
        .eq("id", user.id)
        .single();

      if (profile && profile.pet_points >= cost) {
        await supabase
          .from("profiles")
          .update({ pet_points: profile.pet_points - cost })
          .eq("id", user.id);
      } else {
        toast.error("Not enough PetPoints!");
        return;
      }
    }

    setPet({ ...pet, ...updates });
    toast.success(`${pet.name} enjoyed that!`);
  };

  const handleUseItem = async (inventoryItemId: string, item: InventoryItem) => {
    if (!pet) return;

    const effectType = item.shop_items.effect_type;
    const effectValue = item.shop_items.effect_value || 0;

    if (!effectType) {
      toast.error("This item has no effect");
      return;
    }

    let updates: any = {};
    
    switch (effectType) {
      case "hunger":
        updates.hunger = Math.max(0, pet.hunger - effectValue);
        break;
      case "happiness":
        updates.happiness = Math.min(100, pet.happiness + effectValue);
        break;
      case "health":
        updates.health = Math.min(100, pet.health + effectValue);
        break;
      case "energy":
        updates.energy = Math.min(100, pet.energy + effectValue);
        break;
      default:
        toast.error("Unknown item effect");
        return;
    }

    const { error: petError } = await supabase
      .from("pets")
      .update(updates)
      .eq("id", pet.id);

    if (petError) {
      toast.error("Failed to use item");
      return;
    }

    // Decrease item quantity or remove if 0
    if (item.quantity > 1) {
      await supabase
        .from("inventory")
        .update({ quantity: item.quantity - 1 })
        .eq("id", inventoryItemId);
      
      setInventory(inventory.map(inv => 
        inv.id === inventoryItemId 
          ? { ...inv, quantity: inv.quantity - 1 }
          : inv
      ));
    } else {
      await supabase
        .from("inventory")
        .delete()
        .eq("id", inventoryItemId);
      
      setInventory(inventory.filter(inv => inv.id !== inventoryItemId));
    }

    setPet({ ...pet, ...updates });
    toast.success(`Used ${item.shop_items.name}!`);
  };

  const handleColorChange = async (newColor: string) => {
    if (!pet) return;

    const { error } = await supabase
      .from("pets")
      .update({ color: newColor })
      .eq("id", pet.id);

    if (error) {
      toast.error("Failed to change color");
      return;
    }

    setPet({ ...pet, color: newColor });
    toast.success("Pet color updated!");
  };

  const handleListPet = async () => {
    if (!pet || !user) return;

    const price = parseInt(listingPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (userPoints < 50) {
      toast.error("You need 50 PP to list a pet (listing fee)");
      return;
    }

    try {
      const { error } = await supabase.rpc("list_pet_on_marketplace", {
        p_user_id: user.id,
        p_pet_id: pet.id,
        p_price: price,
      });

      if (error) throw error;

      toast.success("Pet listed successfully! 50 PP listing fee deducted.");
      setIsAlreadyListed(true);
      setUserPoints(userPoints - 50);
      setListingPrice("");
      setIsListing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to list pet");
    }
  };

  if (loading || !pet) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Pet Display */}
          <Card className="p-6 md:p-8 gradient-card shadow-card">
            <div className="text-center">
              <div
                className="w-48 h-48 md:w-64 md:h-64 mx-auto mb-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: pet.color }}
              >
                <img
                  src={petImages[pet.species]}
                  alt={pet.name}
                  className="w-32 h-32 md:w-48 md:h-48 object-contain"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))' }}
                  loading="lazy"
                />
              </div>
              <h1 className="text-4xl font-bold mb-2">{pet.name}</h1>
              <p className="text-lg text-muted-foreground capitalize mb-4">
                {pet.species} • Level {pet.level}
              </p>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Experience</div>
                <Progress value={(pet.experience / (100 * pet.level)) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {pet.experience} / {100 * pet.level} XP
                </div>
              </div>
            </div>
          </Card>

          {/* Stats & Interactions */}
          <div className="space-y-6">
            {/* Stats */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Stats</h2>
              <div className="space-y-4">
                <StatDisplay label="Hunger" value={pet.hunger} color="stat-hunger" />
                <StatDisplay label="Happiness" value={pet.happiness} color="stat-happiness" />
                <StatDisplay label="Health" value={pet.health} color="stat-health" />
                <StatDisplay label="Energy" value={pet.energy} color="stat-energy" />
              </div>
            </Card>

            {/* Tabs for Actions, Items, Customize */}
            <Card className="p-6">
              <Tabs defaultValue="actions" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                  <TabsTrigger value="items">
                    <Package className="w-4 h-4 mr-2" />
                    Items
                  </TabsTrigger>
                  <TabsTrigger value="customize">
                    <Palette className="w-4 h-4 mr-2" />
                    Customize
                  </TabsTrigger>
                  <TabsTrigger value="sell">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Sell
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="actions" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <Button
                      onClick={() => handleAction("feed", "hunger", -20, 10)}
                      disabled={pet.hunger <= 20}
                      className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                      aria-label="Feed pet (costs 10 PP)"
                    >
                      <UtensilsCrossed className="w-5 md:w-6 h-5 md:h-6" />
                      <span className="hidden sm:inline">Feed (10 PP)</span>
                      <span className="sm:hidden">Feed</span>
                    </Button>
                    <Button
                      onClick={() => handleAction("play", "happiness", 15, 5)}
                      disabled={pet.energy <= 20}
                      className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                      aria-label="Play with pet (costs 5 PP)"
                    >
                      <Gamepad2 className="w-5 md:w-6 h-5 md:h-6" />
                      <span className="hidden sm:inline">Play (5 PP)</span>
                      <span className="sm:hidden">Play</span>
                    </Button>
                    <Button
                      onClick={() => handleAction("groom", "health", 10, 8)}
                      disabled={pet.health >= 90}
                      className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                      aria-label="Groom pet (costs 8 PP)"
                    >
                      <Sparkles className="w-5 md:w-6 h-5 md:h-6" />
                      <span className="hidden sm:inline">Groom (8 PP)</span>
                      <span className="sm:hidden">Groom</span>
                    </Button>
                    <Button
                      onClick={() => handleAction("rest", "energy", 25, 0)}
                      disabled={pet.energy >= 75}
                      className="h-16 md:h-20 flex-col gap-1 md:gap-2 text-xs md:text-sm"
                      aria-label="Let pet rest (free)"
                    >
                      <Moon className="w-5 md:w-6 h-5 md:h-6" />
                      <span className="hidden sm:inline">Rest (Free)</span>
                      <span className="sm:hidden">Rest</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Each action earns 10 XP toward the next level!
                  </p>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  {inventory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No items in inventory. Visit the shop to buy items!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {inventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{item.shop_items.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.shop_items.effect_type && 
                                `${item.shop_items.effect_type} ${item.shop_items.effect_value > 0 ? '+' : ''}${item.shop_items.effect_value}`
                              }
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                            <Button
                              size="sm"
                              onClick={() => handleUseItem(item.id, item)}
                            >
                              Use
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="customize" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Pet Color</label>
                    <Select value={pet.color} onValueChange={handleColorChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {petColors.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="sell" className="space-y-4">
                  {isAlreadyListed ? (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <p className="text-lg font-medium mb-2">Pet is listed on marketplace</p>
                      <p className="text-sm text-muted-foreground">
                        Visit the marketplace to manage your listing
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => navigate("/marketplace")}
                      >
                        Go to Marketplace
                      </Button>
                    </div>
                  ) : isListing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Price (PetPoints)
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter price..."
                          value={listingPrice}
                          onChange={(e) => setListingPrice(e.target.value)}
                          min="1"
                        />
                      </div>
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium mb-1">Listing Fee: 50 PP</p>
                        <p className="text-muted-foreground">
                          A 5% marketplace fee will be deducted from the sale price when sold.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsListing(false);
                            setListingPrice("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleListPet}
                          disabled={!listingPrice}
                          className="flex-1"
                        >
                          Confirm Listing
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-4">
                        List {pet.name} on the marketplace for other players to buy.
                        <br />
                        <span className="text-xs">Listing fee: 50 PP • Marketplace fee: 5%</span>
                      </p>
                      <Button onClick={() => setIsListing(true)}>
                        List on Marketplace
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatDisplay = ({
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
      <div className="flex justify-between mb-2">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
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

export default PetDetail;
