import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/ui/navbar";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingCart, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import petAqua from "@/assets/pet-aqua.png";
import petCloud from "@/assets/pet-cloud.png";
import petFluff from "@/assets/pet-fluff.png";
import petGorilla from "@/assets/pet-gorilla.png";
import petSpark from "@/assets/pet-spark.png";
import petTerra from "@/assets/pet-terra.png";

interface MarketplaceListing {
  id: string;
  pet_id: string;
  price: number;
  seller_id: string;
  seller_username?: string;
  pets: {
    name: string;
    species: string;
    level: number;
    element: string;
    health: number;
  };
}

const Marketplace = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [premiumPets, setPremiumPets] = useState<any[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasingPremium, setPurchasingPremium] = useState<string | null>(null);
  const [premiumPetName, setPremiumPetName] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getPetImage = (species: string) => {
    const imageMap: Record<string, string> = {
      aqua: petAqua,
      cloud: petCloud,
      fluff: petFluff,
      gorilla: petGorilla,
      spark: petSpark,
      terra: petTerra,
    };
    return imageMap[species.toLowerCase()] || petFluff;
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch premium pets (marketplace exclusive)
    const { data: premiumData } = await supabase
      .from("species_catalog")
      .select("*")
      .gte("unlock_level", 999)
      .eq("is_active", true);

    if (premiumData) {
      setPremiumPets(premiumData);
    }

    // Fetch listings
    const { data: listingsData, error: listingsError } = await supabase
      .from("marketplace_listings")
      .select(`
        *,
        pets (name, species, level, element, health)
      `)
      .eq("status", "active")
      .order("listed_at", { ascending: false });

    if (listingsError) {
      toast({
        title: "Error loading marketplace",
        description: listingsError.message,
        variant: "destructive",
      });
    } else if (listingsData) {
      // Fetch seller usernames separately
      const sellerIds = [...new Set(listingsData.map(l => l.seller_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", sellerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.username]));
      
      const enrichedListings = listingsData.map(listing => ({
        ...listing,
        seller_username: profilesMap.get(listing.seller_id) || "Unknown"
      }));

      setListings(enrichedListings);
    }

    // Fetch user points
    const { data: profileData } = await supabase
      .from("profiles")
      .select("pet_points, solana_balance")
      .eq("id", user!.id)
      .single();

    if (profileData) {
      setUserPoints(profileData.solana_balance ?? profileData.pet_points ?? 0);
    }

    setLoading(false);
  };

  const handlePurchasePremium = async (speciesId: string, price: number) => {
    if (!premiumPetName) {
      toast({
        title: "Name required",
        description: "Please enter a name for your pet.",
        variant: "destructive",
      });
      return;
    }

    if (price > userPoints) {
      toast({
        title: "Insufficient PetPoints",
        description: "You don't have enough PetPoints for this purchase.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check roster space
      const { count: petCount } = await supabase
        .from("pets")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user!.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("max_pets")
        .eq("id", user!.id)
        .single();

      if (petCount && profileData && petCount >= profileData.max_pets) {
        toast({
          title: "Roster full",
          description: `You can only have ${profileData.max_pets} pets. Sell some pets to make space.`,
          variant: "destructive",
        });
        return;
      }

      const species = premiumPets.find(p => p.id === speciesId);
      
      // Deduct points
      const { error: pointsError } = await supabase
        .from("profiles")
        .update({ pet_points: userPoints - price })
        .eq("id", user!.id);

      if (pointsError) throw pointsError;

      // Create pet
      const { error: petError } = await supabase
        .from("pets")
        .insert({
          owner_id: user!.id,
          name: premiumPetName,
          species: speciesId,
          element: species?.element || 'water',
          hunger: 50,
          happiness: 50,
          health: 100,
          energy: 100,
        });

      if (petError) throw petError;

      toast({
        title: "Purchase successful!",
        description: `${premiumPetName} has joined your collection!`,
      });

      setPurchasingPremium(null);
      setPremiumPetName("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePurchase = async (listingId: string, price: number) => {
    if (price > userPoints) {
      toast({
        title: "Insufficient PetPoints",
        description: "You don't have enough PetPoints for this purchase.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc("purchase_marketplace_pet", {
        p_listing_id: listingId,
        p_buyer_id: user!.id,
      });

      if (error) throw error;

      toast({
        title: "Purchase successful!",
        description: "The pet has been added to your collection.",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto p-6 pt-24">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground">Buy and sell pets with other players</p>
          </div>
          <div className="flex items-center gap-2 bg-card p-4 rounded-lg border">
            <Coins className="w-5 h-5 text-primary" />
            <span className="text-xl font-semibold">{userPoints}</span>
            <span className="text-sm text-muted-foreground">Tokens</span>
          </div>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {/* Premium Pets Section */}
            {premiumPets.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-accent" />
                  <h2 className="text-2xl font-bold">Premium Pets</h2>
                  <Badge variant="secondary" className="bg-accent/20">Exclusive</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {premiumPets.map((pet) => (
                    <Card key={pet.id} className="border-accent/50 shadow-lg">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {pet.display_name}
                              <Sparkles className="w-4 h-4 text-accent" />
                            </CardTitle>
                            <CardDescription>{pet.description}</CardDescription>
                          </div>
                          <Badge className="bg-accent">{pet.element}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <img 
                          src={getPetImage(pet.id)} 
                          alt={pet.display_name}
                          className="w-full h-48 object-contain mb-4"
                        />
                        {purchasingPremium === pet.id ? (
                          <div className="space-y-2">
                            <Label htmlFor="premium-name">Name your pet</Label>
                            <Input
                              id="premium-name"
                              value={premiumPetName}
                              onChange={(e) => setPremiumPetName(e.target.value)}
                              placeholder="Enter a name..."
                              maxLength={20}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rarity</span>
                              <span className="font-bold text-accent">{pet.rarity?.toUpperCase()}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-primary" />
                          <span className="text-2xl font-bold">500</span>
                        </div>
                        {purchasingPremium === pet.id ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setPurchasingPremium(null);
                                setPremiumPetName("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={() => handlePurchasePremium(pet.id, 500)}>
                              Confirm
                            </Button>
                          </div>
                        ) : (
                          <Button onClick={() => setPurchasingPremium(pet.id)}>
                            Buy Now
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Listings */}
            <h2 className="text-2xl font-bold mb-4">Player Listings</h2>
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : listings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">No pets listed for sale</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{listing.pets.name}</CardTitle>
                          <CardDescription>
                            {listing.pets.species} • Level {listing.pets.level}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{listing.pets.element}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <img 
                        src={getPetImage(listing.pets.species)} 
                        alt={listing.pets.name}
                        className="w-full h-40 object-contain mb-4"
                      />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Health</span>
                          <span className="font-medium">{listing.pets.health}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Seller</span>
                          <span className="font-medium">{listing.seller_username}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold">{listing.price}</span>
                      </div>
                      <Button
                        onClick={() => handlePurchase(listing.id, listing.price)}
                        disabled={listing.seller_id === user.id}
                      >
                        {listing.seller_id === user.id ? "Your Pet" : "Buy Now"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-listings">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : listings.filter(l => l.seller_id === user.id).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground mb-2">You have no active listings</p>
                  <p className="text-sm text-muted-foreground">
                    Visit your pet's detail page to list it for sale (50 Tokens listing fee)
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.filter(l => l.seller_id === user.id).map((listing) => (
                  <Card key={listing.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{listing.pets.name}</CardTitle>
                          <CardDescription>
                            {listing.pets.species} • Level {listing.pets.level}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{listing.pets.element}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <img 
                        src={getPetImage(listing.pets.species)} 
                        alt={listing.pets.name}
                        className="w-full h-40 object-contain mb-4"
                      />
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Health</span>
                          <span className="font-medium">{listing.pets.health}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="outline">Listed</Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold">{listing.price}</span>
                      </div>
                      <Button variant="outline" disabled>
                        Listed
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Marketplace;
