import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { trackQuestProgress } from "@/lib/questTracker";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  effect_type: string | null;
  effect_value: number | null;
}

interface Profile {
  pet_points: number;
  solana_balance: number;
}

const Shop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch shop items
        const { data: itemsData, error: itemsError } = await supabase
          .from("shop_items")
          .select("*");

        if (itemsError) throw itemsError;
        setItems(itemsData || []);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("pet_points, solana_balance")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (error: any) {
        toast.error(error.message || "Failed to load shop");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user || !profile) return;

    try {
      // Use atomic RPC function to prevent race conditions
      const { error } = await supabase.rpc('purchase_shop_item', {
        p_user_id: user.id,
        p_item_id: item.id,
        p_item_price: item.price
      });

      if (error) throw error;

      // Track quest progress for shop purchases
      await trackQuestProgress(user.id, 'challenge', 1);

      setProfile({ 
        pet_points: profile.pet_points, 
        solana_balance: (profile.solana_balance || profile.pet_points) - item.price 
      });
      toast.success(`Purchased ${item.name}!`);
    } catch (error: any) {
      toast.error(error.message || "Purchase failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Loading shop...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">Pet Shop</h1>
            <p className="text-sm md:text-base text-muted-foreground">Buy items for your pets</p>
          </div>
          <div className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-accent/20 rounded-full justify-center md:justify-start">
            <Coins className="w-5 md:w-6 h-5 md:h-6 text-accent flex-shrink-0" />
            <span className="font-bold text-base md:text-lg">{profile?.solana_balance ?? profile?.pet_points ?? 0} Tokens</span>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="all">All Items</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <ItemGrid items={items} onPurchase={handlePurchase} />
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <ItemGrid
                items={items.filter((item) => item.category === category)}
                onPurchase={handlePurchase}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

const ItemGrid = ({
  items,
  onPurchase,
}: {
  items: ShopItem[];
  onPurchase: (item: ShopItem) => void;
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {items.map((item) => (
        <Card key={item.id} className="p-4 md:p-6 gradient-card shadow-card hover:shadow-lg transition-smooth flex flex-col">
          <div className="mb-4 flex-1">
            <div className="w-full h-24 md:h-32 bg-muted/50 rounded-lg flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 md:w-12 h-8 md:h-12 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-base md:text-lg mb-2">{item.name}</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
            {item.effect_type && (
              <p className="text-xs text-primary font-medium capitalize">
                {item.effect_type.replace(/_/g, ' ')} {item.effect_value > 0 ? "+" : ""}
                {item.effect_value}{item.effect_type.includes('boost') ? '%' : ''}
              </p>
            )}
          </div>
          <Button
            onClick={() => onPurchase(item)}
            className="w-full shadow-button text-sm md:text-base"
            aria-label={`Buy ${item.name} for ${item.price} Tokens`}
          >
            <Coins className="w-4 h-4 mr-2" />
            {item.price} Tokens
          </Button>
        </Card>
      ))}
    </div>
  );
};

export default Shop;
