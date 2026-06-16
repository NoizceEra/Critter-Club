import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sword, Shield, Zap, Cloud, Flame, Droplet, Mountain, Wind, Sparkles, MoveRight, Package, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { trackQuestProgress } from "@/lib/questTracker";
import { PvPBattleInterface } from "@/components/battle/PvPBattleInterface";
import { RealtimeBattleSync } from "@/components/battle/RealtimeBattleSync";
import petAqua from "@/assets/pet-aqua.png";
import petCloud from "@/assets/pet-cloud.png";
import petFluff from "@/assets/pet-fluff.png";
import petGorilla from "@/assets/pet-gorilla.png";
import petSpark from "@/assets/pet-spark.png";
import petTerra from "@/assets/pet-terra.png";

interface Skill {
  name: string;
  power: number;
  element: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  level: number;
  health: number;
  energy: number;
  hunger: number;
  happiness: number;
  color: string;
  element: string;
  skills: Skill[];
  owner_id?: string;
}

interface BattleItem {
  id: string;
  item_id: string;
  name: string;
  effect_type: string;
  effect_value: number;
  quantity: number;
}

type StatusEffect = "burn" | "freeze" | "paralysis" | "poison" | null;
type Weather = "sunny" | "rainy" | "windy" | "rocky" | "clear";

interface BattlePet extends Pet {
  currentHealth: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  statusEffect: StatusEffect;
  statusTurns: number;
  isDefending: boolean;
  isDodging: boolean;
  attackBoost: number;
  defenseBoost: number;
  speedBoost: number;
  boostTurns: number;
  isFainted: boolean;
}

const Battle = () => {
  const { user } = useAuth();
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<BattlePet[]>([]);
  const [activePetIndex, setActivePetIndex] = useState(0);
  const [opponentTeam, setOpponentTeam] = useState<BattlePet[]>([]);
  const [activeOpponentIndex, setActiveOpponentIndex] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [inBattle, setInBattle] = useState(false);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [weather, setWeather] = useState<Weather>("clear");
  const [comboCount, setComboCount] = useState(0);
  const [lastSkillElement, setLastSkillElement] = useState<string | null>(null);
  const [battleItems, setBattleItems] = useState<BattleItem[]>([]);
  const [specialCooldown, setSpecialCooldown] = useState(0);
  const [dodgeCooldown, setDodgeCooldown] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [currentBattleId, setCurrentBattleId] = useState<string | null>(null);
  const [totalAttackerDamage, setTotalAttackerDamage] = useState(0);
  const [totalDefenderDamage, setTotalDefenderDamage] = useState(0);
  const [isPvPBattle, setIsPvPBattle] = useState(false);
  const [isAttacker, setIsAttacker] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(true);

  const activePet = selectedTeam[activePetIndex];
  const activeOpponent = opponentTeam[activeOpponentIndex];

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
    if (user) {
      fetchMyPets();
      fetchAllPets();
      fetchBattleItems();
    }
  }, [user]);

  const fetchMyPets = async () => {
    const { data } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user?.id);
    if (data) {
      const parsedPets = data.map(pet => ({
        ...pet,
        skills: (pet.skills as any) || []
      }));
      setMyPets(parsedPets as Pet[]);
    }
  };

  const fetchAllPets = async () => {
    const { data } = await supabase
      .from("pets")
      .select("*")
      .neq("owner_id", user?.id)
      .limit(20);
    if (data) {
      const parsedPets = data.map(pet => ({
        ...pet,
        skills: (pet.skills as any) || []
      }));
      setAllPets(parsedPets as Pet[]);
    }
  };

  const fetchBattleItems = async () => {
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
      .eq("user_id", user?.id);

    if (inventoryData) {
      const battleItems = inventoryData
        .filter((item: any) => item.shop_items?.category === "battle")
        .map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          name: item.shop_items.name,
          effect_type: item.shop_items.effect_type,
          effect_value: item.shop_items.effect_value,
          quantity: item.quantity,
        }));
      setBattleItems(battleItems);
    }
  };

  const getTypeEffectiveness = (attackElement: string, defenseElement: string): number => {
    const effectiveness: { [key: string]: { [key: string]: number } } = {
      fire: { water: 0.5, earth: 2, air: 1, light: 1, fire: 1 },
      water: { fire: 2, earth: 0.5, air: 1, light: 1, water: 1 },
      earth: { water: 2, air: 0.5, fire: 1, light: 1, earth: 1 },
      air: { earth: 2, fire: 0.5, water: 1, light: 1, air: 1 },
      light: { fire: 1.2, water: 1.2, earth: 1.2, air: 1.2, light: 1 },
    };
    return effectiveness[attackElement]?.[defenseElement] || 1;
  };

  const getWeatherBonus = (element: string, currentWeather: Weather): number => {
    const bonuses: { [key: string]: { [key in Weather]: number } } = {
      fire: { sunny: 1.5, rainy: 0.7, windy: 1, rocky: 1, clear: 1 },
      water: { sunny: 0.7, rainy: 1.5, windy: 1, rocky: 1, clear: 1 },
      air: { sunny: 1, rainy: 1, windy: 1.5, rocky: 0.7, clear: 1 },
      earth: { sunny: 1, rainy: 1, windy: 0.7, rocky: 1.5, clear: 1 },
      light: { sunny: 1.3, rainy: 1, windy: 1, rocky: 1, clear: 1 },
    };
    return bonuses[element]?.[currentWeather] || 1;
  };

  const getCareMultiplier = (pet: Pet): { multiplier: number; warnings: string[] } => {
    const warnings: string[] = [];
    let multiplier = 1;

    // Health affects overall performance
    if (pet.health < 30) {
      multiplier *= 0.6;
      warnings.push(`${pet.name} is in poor health!`);
    } else if (pet.health < 60) {
      multiplier *= 0.8;
      warnings.push(`${pet.name}'s health could be better`);
    }

    // Energy affects attack and speed
    if (pet.energy < 30) {
      multiplier *= 0.7;
      warnings.push(`${pet.name} is exhausted!`);
    } else if (pet.energy < 60) {
      multiplier *= 0.9;
    }

    // Hunger affects defense
    if (pet.hunger > 70) {
      multiplier *= 0.7;
      warnings.push(`${pet.name} is starving!`);
    } else if (pet.hunger > 40) {
      multiplier *= 0.85;
    }

    // Happiness affects all stats
    if (pet.happiness < 30) {
      multiplier *= 0.75;
      warnings.push(`${pet.name} is very unhappy!`);
    } else if (pet.happiness < 60) {
      multiplier *= 0.9;
    }

    // Bonus for well-cared pets
    if (pet.health >= 80 && pet.energy >= 80 && pet.hunger <= 30 && pet.happiness >= 80) {
      multiplier *= 1.2;
      warnings.push(`${pet.name} is in excellent condition! +20% boost!`);
    }

    return { multiplier, warnings };
  };

  const calculateStats = (pet: Pet): BattlePet => {
    const maxHealth = 100 + pet.level * 20;
    const { multiplier, warnings } = getCareMultiplier(pet);
    
    return {
      ...pet,
      currentHealth: maxHealth,
      maxHealth,
      attack: Math.floor((10 + pet.level * 3) * multiplier),
      defense: Math.floor((5 + pet.level * 2) * multiplier),
      speed: Math.floor((8 + pet.level * 2) * multiplier),
      statusEffect: null,
      statusTurns: 0,
      isDefending: false,
      isDodging: false,
      attackBoost: 0,
      defenseBoost: 0,
      speedBoost: 0,
      boostTurns: 0,
      isFainted: false,
    };
  };

  const randomWeather = (): Weather => {
    const weathers: Weather[] = ["sunny", "rainy", "windy", "rocky", "clear"];
    return weathers[Math.floor(Math.random() * weathers.length)];
  };

  const togglePetSelection = (pet: Pet) => {
    const petInTeam = selectedTeam.find(p => p.id === pet.id);
    
    if (petInTeam) {
      setSelectedTeam(selectedTeam.filter(p => p.id !== pet.id));
    } else {
      if (selectedTeam.length >= 3) {
        toast({
          title: "Team Full",
          description: "You can only have 3 pets in your team",
          variant: "destructive",
        });
        return;
      }
      
      const { warnings } = getCareMultiplier(pet);
      if (warnings.length > 0 && warnings.some(w => w.includes('!'))) {
        toast({
          title: "Warning",
          description: warnings.join(', '),
          variant: "destructive",
        });
      }
      
      setSelectedTeam([...selectedTeam, calculateStats(pet)]);
    }
  };

  const startAIBattle = async () => {
    if (selectedTeam.length === 0) {
      toast({
        title: "No Team Selected",
        description: "Select 1-3 pets to battle with",
        variant: "destructive",
      });
      return;
    }

    const elements = ["light", "fire", "water", "earth", "air"];
    const speciesNames = ["Fluff", "Spark", "Aqua", "Terra", "Cloud"];
    const speciesIds = ["fluff", "spark", "aqua", "terra", "cloud"];
    
    const aiTeam: BattlePet[] = [];
    for (let i = 0; i < Math.min(selectedTeam.length, 3); i++) {
      const randomIndex = Math.floor(Math.random() * 5);
      const aiPet: BattlePet = calculateStats({
        id: "ai-" + Date.now() + "-" + i,
        name: "Wild " + speciesNames[randomIndex],
        species: speciesIds[randomIndex],
        element: elements[randomIndex],
        level: Math.max(1, selectedTeam[0].level - 2 + Math.floor(Math.random() * 5)),
        health: 100,
        energy: 100,
        hunger: 50,
        happiness: 50,
        color: "blue",
        skills: [],
      });
      aiTeam.push(aiPet);
    }

    // Create battle record
    if (user) {
      const { data: battle, error } = await supabase
        .from("battles")
        .insert({
          attacker_id: user.id,
          attacker_pet_id: selectedTeam[0].id,
          defender_pet_id: aiTeam[0].id,
          is_ai_battle: true,
          status: 'active'
        })
        .select()
        .single();

      if (!error && battle) {
        setCurrentBattleId(battle.id);
      }
    }

    const newWeather = randomWeather();
    setWeather(newWeather);
    setOpponentTeam(aiTeam);
    setActiveOpponentIndex(0);
    setActivePetIndex(0);
    setInBattle(true);
    setComboCount(0);
    setLastSkillElement(null);
    setSpecialCooldown(0);
    setDodgeCooldown(0);
    setTurnCount(0);
    setTotalAttackerDamage(0);
    setTotalDefenderDamage(0);
    
    const careWarnings = selectedTeam.map(pet => getCareMultiplier(pet).warnings).flat();
    setBattleLog([
      `Battle started! Your team vs ${aiTeam.length} wild pets!`,
      `Weather: ${newWeather.charAt(0).toUpperCase() + newWeather.slice(1)}`,
      ...careWarnings,
    ]);
  };

  const startPvPBattle = async (opponentPets: Pet[]) => {
    if (selectedTeam.length === 0) {
      toast({
        title: "No Team Selected",
        description: "Select 1-3 pets to battle with",
        variant: "destructive",
      });
      return;
    }

    const opTeam = opponentPets.slice(0, 3).map(pet => calculateStats(pet));
    
    // Create battle record
    if (user) {
      const { data: battle, error } = await supabase
        .from("battles")
        .insert({
          attacker_id: user.id,
          attacker_pet_id: selectedTeam[0].id,
          defender_id: opponentPets[0].owner_id,
          defender_pet_id: opponentPets[0].id,
          is_ai_battle: false,
          status: 'active'
        })
        .select()
        .single();

      if (!error && battle) {
        setCurrentBattleId(battle.id);
      }
    }

    const newWeather = randomWeather();
    setWeather(newWeather);
    setOpponentTeam(opTeam);
    setActiveOpponentIndex(0);
    setActivePetIndex(0);
    setInBattle(true);
    setComboCount(0);
    setLastSkillElement(null);
    setSpecialCooldown(0);
    setDodgeCooldown(0);
    setTurnCount(0);
    setTotalAttackerDamage(0);
    setTotalDefenderDamage(0);
    
    const careWarnings = selectedTeam.map(pet => getCareMultiplier(pet).warnings).flat();
    setBattleLog([
      `Team battle started!`,
      `Weather: ${newWeather.charAt(0).toUpperCase() + newWeather.slice(1)}`,
      ...careWarnings,
    ]);
  };

  const switchPet = (index: number) => {
    if (selectedTeam[index].isFainted) {
      toast({ title: "Can't Switch", description: "That pet has fainted!", variant: "destructive" });
      return;
    }
    setActivePetIndex(index);
    setBattleLog((prev) => [...prev, `Go, ${selectedTeam[index].name}!`]);
    
    // Save battle turn
    saveBattleTurn('attacker', 'switch', 0);
    
    setTimeout(() => opponentTurn(), 1000);
  };

  const useItem = async (item: BattleItem) => {
    if (!activePet || !activeOpponent) return;

    const updatedTeam = [...selectedTeam];
    const pet = updatedTeam[activePetIndex];

    switch (item.effect_type) {
      case "heal":
        const healAmount = item.effect_value === 100 ? pet.maxHealth : Math.min(item.effect_value, pet.maxHealth - pet.currentHealth);
        pet.currentHealth = Math.min(pet.maxHealth, pet.currentHealth + healAmount);
        setBattleLog((prev) => [...prev, `Used ${item.name}! Restored ${healAmount} HP!`]);
        break;
      
      case "attack_boost":
        pet.attackBoost = item.effect_value;
        pet.boostTurns = 3;
        setBattleLog((prev) => [...prev, `Used ${item.name}! Attack increased by ${item.effect_value}%!`]);
        break;
      
      case "defense_boost":
        pet.defenseBoost = item.effect_value;
        pet.boostTurns = 3;
        setBattleLog((prev) => [...prev, `Used ${item.name}! Defense increased by ${item.effect_value}%!`]);
        break;
      
      case "speed_boost":
        pet.speedBoost = item.effect_value;
        pet.boostTurns = 3;
        setBattleLog((prev) => [...prev, `Used ${item.name}! Speed increased by ${item.effect_value}%!`]);
        break;
      
      case "cure":
        pet.statusEffect = null;
        pet.statusTurns = 0;
        setBattleLog((prev) => [...prev, `Used ${item.name}! Status effects cured!`]);
        break;
      
      case "revive":
        const faintedIndex = updatedTeam.findIndex(p => p.isFainted);
        if (faintedIndex !== -1) {
          updatedTeam[faintedIndex].isFainted = false;
          updatedTeam[faintedIndex].currentHealth = Math.floor(updatedTeam[faintedIndex].maxHealth * 0.5);
          setBattleLog((prev) => [...prev, `Used ${item.name}! ${updatedTeam[faintedIndex].name} was revived!`]);
        }
        break;
    }

    setSelectedTeam(updatedTeam);

    // Consume item
    await supabase
      .from("inventory")
      .update({ quantity: item.quantity - 1 })
      .eq("id", item.id);
    
    if (item.quantity - 1 <= 0) {
      await supabase.from("inventory").delete().eq("id", item.id);
    }
    
    // Save battle turn
    saveBattleTurn('attacker', 'item', 0, undefined, item.name);
    
    fetchBattleItems();
    setTimeout(() => opponentTurn(), 1000);
  };

  const applyStatusEffect = (attacker: BattlePet, defender: BattlePet): { defender: BattlePet, log: string } => {
    let log = "";
    const chance = 0.15;
    
    if (Math.random() < chance && !defender.statusEffect) {
      const statusMap: { [key: string]: StatusEffect } = {
        fire: "burn",
        water: "freeze",
        air: "paralysis",
        earth: "poison",
      };
      
      const status = statusMap[attacker.element];
      if (status) {
        defender = { ...defender, statusEffect: status, statusTurns: 3 };
        const statusNames = { burn: "Burned", freeze: "Frozen", paralysis: "Paralyzed", poison: "Poisoned" };
        log = `${defender.name} was ${statusNames[status]}!`;
      }
    }
    
    return { defender, log };
  };

  const processStatusEffect = (pet: BattlePet): { pet: BattlePet, damage: number, log: string } => {
    if (!pet.statusEffect || pet.statusTurns <= 0) {
      return { pet: { ...pet, statusEffect: null, statusTurns: 0 }, damage: 0, log: "" };
    }

    let damage = 0;
    let log = "";
    const newTurns = pet.statusTurns - 1;

    switch (pet.statusEffect) {
      case "burn":
        damage = Math.floor(pet.maxHealth * 0.08);
        log = `${pet.name} took ${damage} burn damage!`;
        break;
      case "poison":
        damage = Math.floor(pet.maxHealth * 0.06);
        log = `${pet.name} took ${damage} poison damage!`;
        break;
      case "freeze":
        log = `${pet.name} is frozen and can't attack!`;
        break;
      case "paralysis":
        if (Math.random() < 0.25) {
          log = `${pet.name} is paralyzed and can't move!`;
        }
        break;
    }

    const newHealth = Math.max(0, pet.currentHealth - damage);
    const updatedPet = {
      ...pet,
      currentHealth: newHealth,
      statusTurns: newTurns,
      statusEffect: newTurns > 0 ? pet.statusEffect : null
    };

    return { pet: updatedPet, damage, log };
  };

  const defend = () => {
    if (!activePet || !activeOpponent) return;

    const updatedTeam = [...selectedTeam];
    updatedTeam[activePetIndex] = { ...activePet, isDefending: true, isDodging: false };
    setSelectedTeam(updatedTeam);
    setBattleLog((prev) => [...prev, `${activePet.name} took a defensive stance!`]);
    
    // Save battle turn
    saveBattleTurn('attacker', 'defend', 0);

    if (!isPvPBattle) {
      setTimeout(() => opponentTurn(), 1000);
    }
  };

  const dodge = () => {
    if (!activePet || !activeOpponent || dodgeCooldown > 0) return;

    const updatedTeam = [...selectedTeam];
    updatedTeam[activePetIndex] = { ...activePet, isDodging: true, isDefending: false };
    setSelectedTeam(updatedTeam);
    setDodgeCooldown(2);
    setBattleLog((prev) => [...prev, `${activePet.name} prepares to dodge and counter!`]);
    
    // Save battle turn
    saveBattleTurn('attacker', 'dodge', 0);

    if (!isPvPBattle) {
      setTimeout(() => opponentTurn(), 1000);
    }
  };

  const specialAttack = () => {
    if (!activePet || !activeOpponent || specialCooldown > 0) return;

    const specialSkill: Skill = {
      name: "Special Attack",
      power: activePet.attack * 2,
      element: activePet.element
    };

    setSpecialCooldown(3);
    setBattleLog((prev) => [...prev, `${activePet.name} charges a special attack!`]);
    attack(specialSkill);
  };

  // Helper function to save battle turn to database
  const saveBattleTurn = async (
    actorType: 'attacker' | 'defender',
    actionType: string,
    damageDealt: number,
    skillUsed?: string,
    itemUsed?: string
  ) => {
    if (!currentBattleId) return;
    
    try {
      const attackerHp = selectedTeam[activePetIndex]?.currentHealth || 0;
      const defenderHp = opponentTeam[activeOpponentIndex]?.currentHealth || 0;
      
      await supabase.from('battle_turns').insert({
        battle_id: currentBattleId,
        turn_number: turnCount,
        actor_type: actorType,
        action_type: actionType,
        skill_used: skillUsed,
        item_used: itemUsed,
        damage_dealt: damageDealt,
        attacker_hp: attackerHp,
        defender_hp: defenderHp
      });
    } catch (error) {
      console.error('Error saving battle turn:', error);
    }
  };

  const attack = (skill?: Skill) => {
    if (!activePet || !activeOpponent) return;

    // Update cooldowns and boosts
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);
    setSpecialCooldown(Math.max(0, specialCooldown - 1));
    setDodgeCooldown(Math.max(0, dodgeCooldown - 1));

    const updatedTeam = [...selectedTeam];
    const currentPet = { ...updatedTeam[activePetIndex], isDefending: false, isDodging: false };
    
    if (currentPet.boostTurns > 0) {
      currentPet.boostTurns--;
      if (currentPet.boostTurns === 0) {
        currentPet.attackBoost = 0;
        currentPet.defenseBoost = 0;
        currentPet.speedBoost = 0;
      }
    }
    updatedTeam[activePetIndex] = currentPet;
    setSelectedTeam(updatedTeam);

    // Check if frozen
    if (currentPet.statusEffect === "freeze") {
      const statusResult = processStatusEffect(currentPet);
      updatedTeam[activePetIndex] = statusResult.pet;
      setSelectedTeam(updatedTeam);
      setBattleLog((prev) => [...prev, statusResult.log]);
      
      setTimeout(() => opponentTurn(), 1000);
      return;
    }

    // Check if paralyzed
    if (currentPet.statusEffect === "paralysis" && Math.random() < 0.25) {
      const statusResult = processStatusEffect(currentPet);
      updatedTeam[activePetIndex] = statusResult.pet;
      setSelectedTeam(updatedTeam);
      setBattleLog((prev) => [...prev, statusResult.log]);
      
      setTimeout(() => opponentTurn(), 1000);
      return;
    }

    const skillToUse = skill || { name: "Basic Attack", power: 20, element: currentPet.element };
    
    // Combo system
    let comboBonus = 1;
    if (skill && lastSkillElement === skill.element) {
      setComboCount(prev => prev + 1);
      comboBonus = 1 + (comboCount * 0.15);
    } else {
      setComboCount(0);
    }
    setLastSkillElement(skill?.element || null);

    // Calculate dodge chance
    const speedDiff = currentPet.speed - activeOpponent.speed;
    const dodgeChance = Math.max(0, Math.min(0.3, speedDiff * 0.02));
    
    if (Math.random() < dodgeChance) {
      setBattleLog((prev) => [...prev, `${activeOpponent.name} dodged the attack!`]);
      setTimeout(() => opponentTurn(), 1000);
      return;
    }

    // Calculate critical hit
    const critChance = 0.15 + (currentPet.speed * 0.001);
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? 1.5 : 1;

    // Apply stat boosts
    const attackBoost = 1 + (currentPet.attackBoost / 100);
    
    const baseDamage = skill ? skillToUse.power : currentPet.attack;
    const typeMultiplier = getTypeEffectiveness(skillToUse.element, activeOpponent.element);
    const weatherMultiplier = getWeatherBonus(skillToUse.element, weather);
    const randomFactor = 0.85 + Math.random() * 0.3;
    const damage = Math.max(5, Math.floor(
      (baseDamage * attackBoost - activeOpponent.defense / 2) * 
      typeMultiplier * 
      weatherMultiplier * 
      critMultiplier * 
      comboBonus * 
      randomFactor
    ));
    
    // Track attacker damage
    setTotalAttackerDamage(prev => prev + damage);
    
    // Save battle turn to database
    saveBattleTurn('attacker', skill ? 'skill' : 'attack', damage, skillToUse.name);
    
    const updatedOpponentTeam = [...opponentTeam];
    let newOpponentHealth = Math.max(0, activeOpponent.currentHealth - damage);
    
    let messages = [];
    messages.push(`${currentPet.name} used ${skillToUse.name}! Dealt ${damage} damage!`);
    
    if (isCrit) messages.push("💥 Critical hit!");
    if (typeMultiplier > 1) messages.push("✨ It's super effective!");
    if (typeMultiplier < 1) messages.push("💨 It's not very effective...");
    if (comboBonus > 1) messages.push(`🔥 ${comboCount + 1}x Combo!`);
    if (weatherMultiplier > 1) messages.push("☀️ Weather boosted!");
    if (attackBoost > 1) messages.push("⚡ Attack boosted!");

    // Apply status effect
    const statusResult = applyStatusEffect(currentPet, activeOpponent);
    updatedOpponentTeam[activeOpponentIndex] = { ...statusResult.defender, currentHealth: newOpponentHealth };
    if (statusResult.log) messages.push(statusResult.log);

    setBattleLog((prev) => [...prev, ...messages]);
    setOpponentTeam(updatedOpponentTeam);

    if (newOpponentHealth <= 0) {
      updatedOpponentTeam[activeOpponentIndex].isFainted = true;
      setOpponentTeam(updatedOpponentTeam);
      setBattleLog((prev) => [...prev, `${activeOpponent.name} fainted!`]);
      
      const nextOpponent = updatedOpponentTeam.findIndex(p => !p.isFainted);
      if (nextOpponent === -1) {
        endBattle(true);
        return;
      } else {
        setActiveOpponentIndex(nextOpponent);
        setBattleLog((prev) => [...prev, `Next opponent: ${updatedOpponentTeam[nextOpponent].name}!`]);
      }
    }

    // Process player's status effect
    const playerStatusResult = processStatusEffect(currentPet);
    updatedTeam[activePetIndex] = playerStatusResult.pet;
    setSelectedTeam(updatedTeam);
    if (playerStatusResult.log) {
      setBattleLog((prev) => [...prev, playerStatusResult.log]);
    }
    if (playerStatusResult.pet.currentHealth <= 0) {
      updatedTeam[activePetIndex].isFainted = true;
      setSelectedTeam(updatedTeam);
      setBattleLog((prev) => [...prev, `${currentPet.name} fainted!`]);
      
      const nextPet = updatedTeam.findIndex(p => !p.isFainted);
      if (nextPet === -1) {
        endBattle(false);
        return;
      }
    }

    if (!isPvPBattle) {
      setTimeout(() => opponentTurn(), 1500);
    }
  };

  const opponentTurn = () => {
    if (!activePet || !activeOpponent) return;

    const updatedOpponentTeam = [...opponentTeam];
    const currentOpponent = { ...updatedOpponentTeam[activeOpponentIndex], isDefending: false, isDodging: false };
    updatedOpponentTeam[activeOpponentIndex] = currentOpponent;
    setOpponentTeam(updatedOpponentTeam);

    // Check if frozen
    if (currentOpponent.statusEffect === "freeze") {
      const statusResult = processStatusEffect(currentOpponent);
      updatedOpponentTeam[activeOpponentIndex] = statusResult.pet;
      setOpponentTeam(updatedOpponentTeam);
      setBattleLog((prev) => [...prev, statusResult.log]);
      return;
    }

    // Check if paralyzed
    if (currentOpponent.statusEffect === "paralysis" && Math.random() < 0.25) {
      const statusResult = processStatusEffect(currentOpponent);
      updatedOpponentTeam[activeOpponentIndex] = statusResult.pet;
      setOpponentTeam(updatedOpponentTeam);
      setBattleLog((prev) => [...prev, statusResult.log]);
      return;
    }

    // Check if player is dodging
    if (activePet.isDodging && Math.random() < 0.75) {
      setBattleLog((prev) => [...prev, `${activePet.name} dodged the attack!`]);
      
      const counterDamage = Math.floor(activePet.attack * 0.5);
      setTotalAttackerDamage(prev => prev + counterDamage);
      const newOpponentHealth = Math.max(0, currentOpponent.currentHealth - counterDamage);
      updatedOpponentTeam[activeOpponentIndex].currentHealth = newOpponentHealth;
      setOpponentTeam(updatedOpponentTeam);
      setBattleLog((prev) => [...prev, `${activePet.name} countered for ${counterDamage} damage!`]);
      
      if (newOpponentHealth <= 0) {
        updatedOpponentTeam[activeOpponentIndex].isFainted = true;
        setBattleLog((prev) => [...prev, `${currentOpponent.name} fainted!`]);
        
        const nextOpponent = updatedOpponentTeam.findIndex(p => !p.isFainted);
        if (nextOpponent === -1) {
          endBattle(true);
        } else {
          setActiveOpponentIndex(nextOpponent);
        }
      }
      return;
    }

    const opponentSkill = currentOpponent.skills.length > 0 
      ? currentOpponent.skills[Math.floor(Math.random() * currentOpponent.skills.length)]
      : { name: "Basic Attack", power: 20, element: currentOpponent.element };
    
    // Natural dodge
    const speedDiff = currentOpponent.speed - activePet.speed;
    const dodgeChance = Math.max(0, Math.min(0.3, speedDiff * 0.02));
    
    if (Math.random() < dodgeChance) {
      setBattleLog((prev) => [...prev, `${activePet.name} dodged the attack!`]);
      return;
    }

    // Calculate critical hit
    const critChance = 0.15 + (currentOpponent.speed * 0.001);
    const isCrit = Math.random() < critChance;
    const critMultiplier = isCrit ? 1.5 : 1;

    const opponentBaseDamage = currentOpponent.skills.length > 0 ? opponentSkill.power : currentOpponent.attack;
    const opponentTypeMultiplier = getTypeEffectiveness(opponentSkill.element, activePet.element);
    const weatherMultiplier = getWeatherBonus(opponentSkill.element, weather);
    const opponentRandomFactor = 0.85 + Math.random() * 0.3;
    
    const defenseBoost = 1 + (activePet.defenseBoost / 100);
    const defenseMultiplier = activePet.isDefending ? 0.5 : 1;
    
    const opponentDamage = Math.max(5, Math.floor(
      (opponentBaseDamage - activePet.defense * defenseBoost / 2) * 
      opponentTypeMultiplier * 
      weatherMultiplier * 
      critMultiplier * 
      defenseMultiplier *
      opponentRandomFactor
    ));
    
    // Track defender damage
    setTotalDefenderDamage(prev => prev + opponentDamage);
    
    // Save battle turn to database
    saveBattleTurn('defender', 'attack', opponentDamage, opponentSkill.name);
    
    const updatedTeam = [...selectedTeam];
    let newPlayerHealth = Math.max(0, activePet.currentHealth - opponentDamage);
    
    let messages = [];
    messages.push(`${currentOpponent.name} used ${opponentSkill.name}! Dealt ${opponentDamage} damage!`);
    
    if (activePet.isDefending) messages.push("🛡️ Damage reduced by defense!");
    if (isCrit) messages.push("💥 Critical hit!");
    if (opponentTypeMultiplier > 1) messages.push("✨ It's super effective!");
    if (opponentTypeMultiplier < 1) messages.push("💨 It's not very effective...");
    if (weatherMultiplier > 1) messages.push("☀️ Weather boosted!");

    const statusResult = applyStatusEffect(currentOpponent, activePet);
    updatedTeam[activePetIndex] = { ...statusResult.defender, currentHealth: newPlayerHealth };
    if (statusResult.log) messages.push(statusResult.log);

    setBattleLog((prev) => [...prev, ...messages]);
    setSelectedTeam(updatedTeam);

    if (newPlayerHealth <= 0) {
      updatedTeam[activePetIndex].isFainted = true;
      setSelectedTeam(updatedTeam);
      setBattleLog((prev) => [...prev, `${activePet.name} fainted!`]);
      
      const nextPet = updatedTeam.findIndex(p => !p.isFainted);
      if (nextPet === -1) {
        endBattle(false);
        return;
      } else {
        setActivePetIndex(nextPet);
        setBattleLog((prev) => [...prev, `Go, ${updatedTeam[nextPet].name}!`]);
      }
    }

    const opponentStatusResult = processStatusEffect(currentOpponent);
    updatedOpponentTeam[activeOpponentIndex] = opponentStatusResult.pet;
    setOpponentTeam(updatedOpponentTeam);
    if (opponentStatusResult.log) {
      setBattleLog((prev) => [...prev, opponentStatusResult.log]);
    }
    if (opponentStatusResult.pet.currentHealth <= 0) {
      updatedOpponentTeam[activeOpponentIndex].isFainted = true;
      setBattleLog((prev) => [...prev, `${currentOpponent.name} fainted!`]);
      
      const nextOpponent = updatedOpponentTeam.findIndex(p => !p.isFainted);
      if (nextOpponent === -1) {
        endBattle(true);
      } else {
        setActiveOpponentIndex(nextOpponent);
      }
    }
  };

  const handleOpponentRealtimeTurn = (turn: any) => {
    if (!activePet || !activeOpponent) return;

    const damage = turn.damage_dealt || 0;
    
    // Track defender damage
    setTotalDefenderDamage(prev => prev + damage);
    
    const updatedTeam = [...selectedTeam];
    let newPlayerHealth = Math.max(0, activePet.currentHealth - damage);
    
    let messages = [];
    messages.push(`${activeOpponent.name} used ${turn.skill_used || turn.action_type}! Dealt ${damage} damage!`);
    
    updatedTeam[activePetIndex] = { ...activePet, currentHealth: newPlayerHealth };
    setBattleLog((prev) => [...prev, ...messages]);
    setSelectedTeam(updatedTeam);

    if (newPlayerHealth <= 0) {
      updatedTeam[activePetIndex].isFainted = true;
      setSelectedTeam(updatedTeam);
      setBattleLog((prev) => [...prev, `${activePet.name} fainted!`]);
      
      const nextPet = updatedTeam.findIndex(p => !p.isFainted);
      if (nextPet === -1) {
        endBattle(false);
      } else {
        setActivePetIndex(nextPet);
        setBattleLog((prev) => [...prev, `Go, ${updatedTeam[nextPet].name}!`]);
      }
    }
  };

  const endBattle = async (won: boolean) => {
    if (!user || !currentBattleId) {
      // Fallback for battles without proper setup
      setBattleLog((prev) => [
        ...prev,
        won ? "🎉 Victory!" : "💔 Defeat...",
      ]);
      setTimeout(() => {
        setInBattle(false);
        setOpponentTeam([]);
        setSelectedTeam([]);
        setActiveOpponentIndex(0);
        setActivePetIndex(0);
        setComboCount(0);
        setLastSkillElement(null);
        fetchMyPets();
      }, 3000);
      return;
    }

    try {
      // Call server-side edge function to calculate and distribute rewards
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('complete-battle', {
        body: {
          battleId: currentBattleId,
          winnerId: won ? user.id : (opponentTeam[0].id.startsWith('ai-') ? null : opponentTeam[0].owner_id),
          attackerDamageDealt: totalAttackerDamage,
          defenderDamageDealt: totalDefenderDamage
        }
      });

      if (response.error) {
        console.error('Battle completion error:', response.error);
        toast({
          title: "Battle Error",
          description: "Failed to complete battle. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const { rewards, experience } = response.data;

      setBattleLog((prev) => [
        ...prev,
        won ? "🎉 Victory!" : "💔 Defeat...",
        `Earned ${rewards} PetPoints and ${experience} EXP!`,
      ]);

      // Track quest progress for battles
      await trackQuestProgress(user.id, 'battle', 1);
      if (won) {
        await trackQuestProgress(user.id, 'battle', 1);
      }

      setTimeout(() => {
        setInBattle(false);
        setOpponentTeam([]);
        setSelectedTeam([]);
        setActiveOpponentIndex(0);
        setActivePetIndex(0);
        setComboCount(0);
        setLastSkillElement(null);
        setCurrentBattleId(null);
        setTotalAttackerDamage(0);
        setTotalDefenderDamage(0);
        fetchMyPets();
      }, 3000);
    } catch (error) {
      console.error('Unexpected battle error:', error);
      toast({
        title: "Battle Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const getWeatherIcon = () => {
    const icons = {
      sunny: <Flame className="w-4 h-4" />,
      rainy: <Droplet className="w-4 h-4" />,
      windy: <Wind className="w-4 h-4" />,
      rocky: <Mountain className="w-4 h-4" />,
      clear: <Cloud className="w-4 h-4" />
    };
    return icons[weather];
  };

  const getStatusBadge = (status: StatusEffect) => {
    if (!status) return null;
    
    const variants = {
      burn: { text: "🔥 Burn", color: "destructive" as const },
      freeze: { text: "❄️ Freeze", color: "secondary" as const },
      paralysis: { text: "⚡ Paralysis", color: "default" as const },
      poison: { text: "☠️ Poison", color: "destructive" as const },
    };
    
    const badge = variants[status];
    return <Badge variant={badge.color} className="text-xs">{badge.text}</Badge>;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card>
            <CardContent className="p-8">
              <p className="text-foreground">Please log in to battle</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <h1 className="text-4xl font-bold text-center mb-8 text-gradient">Pet Battle Arena</h1>

          {!inBattle ? (
            <Tabs defaultValue="select" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="select">Select Team (1-3)</TabsTrigger>
                <TabsTrigger value="opponents">AI Battle</TabsTrigger>
                <TabsTrigger value="pvp">PVP Battle</TabsTrigger>
              </TabsList>

              <TabsContent value="select">
                <Card>
                  <CardHeader>
                    <CardTitle>Build Your Team ({selectedTeam.length}/3)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTeam.length > 0 && (
                      <div className="flex gap-2 p-4 bg-muted/50 rounded-lg flex-wrap">
                        {selectedTeam.map((pet, idx) => (
                          <Badge key={pet.id} variant="default" className="text-sm">
                            {idx + 1}. {pet.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {myPets.map((pet) => {
                        const { multiplier, warnings } = getCareMultiplier(pet);
                        const isSelected = selectedTeam.some(p => p.id === pet.id);
                        const hasWarnings = warnings.some(w => w.includes('!'));
                        
                        return (
                          <Card
                            key={pet.id}
                            className={`cursor-pointer transition-all ${
                              isSelected ? "ring-2 ring-primary shadow-glow" : "hover:shadow-elegant"
                            }`}
                            onClick={() => togglePetSelection(pet)}
                          >
                            <CardContent className="p-4 text-center">
                              <img
                                src={getPetImage(pet.species)}
                                alt={pet.name}
                                className="w-24 h-24 mx-auto mb-2"
                              />
                              <h3 className="font-semibold">{pet.name}</h3>
                              <p className="text-sm text-muted-foreground">Level {pet.level}</p>
                              <Badge variant="secondary" className="mt-2 text-xs capitalize">
                                {pet.element}
                              </Badge>
                              {hasWarnings && (
                                <div className="mt-2">
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Poor Condition
                                  </Badge>
                                </div>
                              )}
                              {multiplier >= 1.2 && (
                                <div className="mt-2">
                                  <Badge variant="default" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Peak Condition
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="opponents">
                <div className="grid gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        AI Battle
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={startAIBattle} disabled={selectedTeam.length === 0} className="w-full">
                        Fight Wild Pets (Team Battle)
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="pvp">
                <PvPBattleInterface 
                  selectedPets={selectedTeam}
                  onBattleStart={async (battleId, isChallenger, challengerPetId, challengedPetId) => {
                    // Fetch both pets for the battle
                    const myPetId = isChallenger ? challengerPetId : challengedPetId;
                    const opponentPetId = isChallenger ? challengedPetId : challengerPetId;
                    
                    // Get my pet
                    const { data: myPetData } = await supabase
                      .from('pets')
                      .select('*')
                      .eq('id', myPetId)
                      .single();
                    
                    // Get opponent pet
                    const { data: opponentPetData } = await supabase
                      .from('pets')
                      .select('*')
                      .eq('id', opponentPetId)
                      .single();
                    
                    if (myPetData && opponentPetData) {
                      const myPet = { ...myPetData, skills: (myPetData.skills as any) || [] } as Pet;
                      const opponentPet = { ...opponentPetData, skills: (opponentPetData.skills as any) || [] } as Pet;
                      
                      setSelectedTeam([calculateStats(myPet)]);
                      setOpponentTeam([calculateStats(opponentPet)]);
                      setActivePetIndex(0);
                      setActiveOpponentIndex(0);
                      
                      const newWeather = randomWeather();
                      setWeather(newWeather);
                      setBattleLog([
                        `PVP Battle started!`,
                        `Weather: ${newWeather.charAt(0).toUpperCase() + newWeather.slice(1)}`,
                      ]);
                    }
                    
                    setCurrentBattleId(battleId);
                    setIsPvPBattle(true);
                    setIsAttacker(isChallenger);
                    setInBattle(true);
                    setTotalAttackerDamage(0);
                    setTotalDefenderDamage(0);
                    
                    toast({
                      title: "PVP Battle Started!",
                      description: "Real-time battle sync enabled",
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {/* PVP Real-time Sync */}
              {isPvPBattle && currentBattleId && (
                <div className="mb-6">
                  <RealtimeBattleSync
                    battleId={currentBattleId}
                    isAttacker={isAttacker}
                    onTurnChange={setIsMyTurn}
                    onOpponentTurn={handleOpponentRealtimeTurn}
                    onBattleEnd={(winnerId) => {
                      setInBattle(false);
                      setIsPvPBattle(false);
                      setCurrentBattleId(null);
                      toast({
                        title: winnerId === user?.id ? "Victory!" : "Defeat",
                        description: "PVP battle completed",
                      });
                    }}
                  />
                </div>
              )}

              {/* Regular Battle UI */}
              <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-center flex-1">
                    {isPvPBattle ? "PVP Battle!" : "Team Battle!"}
                  </CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getWeatherIcon()}
                    <span className="capitalize">{weather}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Team Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-center text-sm md:text-base">Your Team</h4>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {selectedTeam.map((pet, idx) => (
                        <button
                          key={pet.id}
                          onClick={() => switchPet(idx)}
                          disabled={pet.isFainted || idx === activePetIndex}
                          aria-label={`Switch to ${pet.name}`}
                          className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center text-sm md:text-base font-bold transition-all ${
                            idx === activePetIndex
                              ? "border-primary bg-primary text-primary-foreground scale-110"
                              : pet.isFainted
                              ? "border-muted bg-muted opacity-50"
                              : "border-border hover:border-primary"
                          }`}
                          title={`${pet.name} (${pet.isFainted ? 'Fainted' : 'Active'})`}
                        >
                          {pet.name.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-center text-sm md:text-base">Opponents</h4>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {opponentTeam.map((pet, idx) => (
                        <div
                          key={pet.id}
                          className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center text-sm md:text-base font-bold transition-all ${
                            idx === activeOpponentIndex
                              ? "border-destructive bg-destructive text-destructive-foreground scale-110"
                              : pet.isFainted
                              ? "border-muted bg-muted opacity-50"
                              : "border-border"
                          }`}
                          title={`${pet.name} (${pet.isFainted ? 'Fainted' : 'Active'})`}
                        >
                          {pet.name.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active Pets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div className="text-center space-y-2">
                    <img
                      src={activePet ? getPetImage(activePet.species) : petFluff}
                      alt={activePet?.name || "Your pet"}
                      className="w-24 h-24 md:w-32 md:h-32 mx-auto"
                      loading="lazy"
                    />
                    <h3 className="font-bold">{activePet?.name}</h3>
                    <p className="text-sm text-muted-foreground">Level {activePet?.level}</p>
                    <Badge variant="secondary" className="text-xs capitalize">{activePet?.element}</Badge>
                    {activePet?.statusEffect && getStatusBadge(activePet.statusEffect)}
                    {activePet?.boostTurns > 0 && (
                      <Badge variant="default" className="text-xs">⚡ Boosted ({activePet.boostTurns})</Badge>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>HP</span>
                        <span>
                          {activePet?.currentHealth}/{activePet?.maxHealth}
                        </span>
                      </div>
                      <Progress
                        value={(activePet ? activePet.currentHealth / activePet.maxHealth : 0) * 100}
                        className="bg-stat-health/20"
                      />
                    </div>
                    <div className="flex justify-center gap-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Sword className="h-4 w-4" /> {activePet?.attack}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="h-4 w-4" /> {activePet?.defense}
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <img
                      src={activeOpponent ? getPetImage(activeOpponent.species) : petFluff}
                      alt={activeOpponent?.name || "Opponent pet"}
                      className="w-24 h-24 md:w-32 md:h-32 mx-auto"
                      loading="lazy"
                    />
                    <h3 className="font-bold">{activeOpponent?.name}</h3>
                    <p className="text-sm text-muted-foreground">Level {activeOpponent?.level}</p>
                    <Badge variant="secondary" className="text-xs capitalize">{activeOpponent?.element}</Badge>
                    {activeOpponent?.statusEffect && getStatusBadge(activeOpponent.statusEffect)}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>HP</span>
                        <span>
                          {activeOpponent?.currentHealth}/{activeOpponent?.maxHealth}
                        </span>
                      </div>
                      <Progress
                        value={(activeOpponent ? activeOpponent.currentHealth / activeOpponent.maxHealth : 0) * 100}
                        className="bg-stat-health/20"
                      />
                    </div>
                    <div className="flex justify-center gap-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Sword className="h-4 w-4" /> {activeOpponent?.attack}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="h-4 w-4" /> {activeOpponent?.defense}
                      </span>
                    </div>
                  </div>
                </div>

                {comboCount > 0 && (
                  <div className="text-center">
                    <Badge variant="default" className="text-sm">
                      🔥 {comboCount + 1}x Combo Active!
                    </Badge>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold text-center">Battle Log</h4>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 max-h-40 overflow-y-auto">
                      {battleLog.map((log, index) => (
                        <p key={index} className="text-sm">
                          {log}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-center">Actions</h4>
                  
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <Button
                      onClick={() => attack()}
                      disabled={!activePet || !activeOpponent || activePet.currentHealth <= 0 || activeOpponent.currentHealth <= 0 || (isPvPBattle && !isMyTurn)}
                      variant="default"
                      size="lg"
                      className="h-14 md:h-16 text-sm md:text-base"
                      aria-label="Attack opponent"
                    >
                      <Sword className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
                      <span className="hidden sm:inline">Attack</span>
                      <span className="sm:hidden">ATK</span>
                    </Button>

                    <Button
                      onClick={defend}
                      disabled={!activePet || !activeOpponent || activePet.currentHealth <= 0 || activeOpponent.currentHealth <= 0 || (isPvPBattle && !isMyTurn)}
                      variant="secondary"
                      size="lg"
                      className="h-14 md:h-16 text-sm md:text-base"
                      aria-label="Defend against attacks"
                    >
                      <Shield className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
                      <span className="hidden sm:inline">Defend</span>
                      <span className="sm:hidden">DEF</span>
                    </Button>

                    <Button
                      onClick={dodge}
                      disabled={!activePet || !activeOpponent || activePet.currentHealth <= 0 || activeOpponent.currentHealth <= 0 || dodgeCooldown > 0 || (isPvPBattle && !isMyTurn)}
                      variant="secondary"
                      size="lg"
                      className="h-14 md:h-16 text-sm md:text-base"
                      aria-label={`Dodge attacks${dodgeCooldown > 0 ? ` (${dodgeCooldown} turn cooldown)` : ''}`}
                    >
                      <MoveRight className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
                      <span className="hidden sm:inline">Dodge {dodgeCooldown > 0 && `(${dodgeCooldown})`}</span>
                      <span className="sm:hidden">DOD{dodgeCooldown > 0 && `(${dodgeCooldown})`}</span>
                    </Button>

                    <Button
                      onClick={specialAttack}
                      disabled={!activePet || !activeOpponent || activePet.currentHealth <= 0 || activeOpponent.currentHealth <= 0 || specialCooldown > 0 || (isPvPBattle && !isMyTurn)}
                      variant="default"
                      size="lg"
                      className="bg-gradient-to-r from-primary to-secondary h-14 md:h-16 text-sm md:text-base"
                      aria-label={`Special attack${specialCooldown > 0 ? ` (${specialCooldown} turn cooldown)` : ''}`}
                    >
                      <Sparkles className="mr-1 md:mr-2 h-4 md:h-5 w-4 md:w-5" />
                      <span className="hidden sm:inline">Special {specialCooldown > 0 && `(${specialCooldown})`}</span>
                      <span className="sm:hidden">SP{specialCooldown > 0 && `(${specialCooldown})`}</span>
                    </Button>
                  </div>

                  {activePet && activePet.skills.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-center text-sm">Element Skills</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {activePet.skills.map((skill, index) => (
                          <Button
                            key={index}
                            onClick={() => attack(skill)}
                            disabled={!activePet || !activeOpponent || activePet.currentHealth <= 0 || activeOpponent.currentHealth <= 0 || (isPvPBattle && !isMyTurn)}
                            variant="outline"
                            size="sm"
                          >
                            <Zap className="mr-1 h-4 w-4" />
                            {skill.name}
                            <span className="ml-1 text-xs">({skill.power})</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {battleItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-center text-sm">Items</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {battleItems.slice(0, 6).map((item) => (
                          <Button
                            key={item.id}
                            onClick={() => useItem(item)}
                            disabled={!activePet || !activeOpponent}
                            variant="outline"
                            size="sm"
                          >
                            <Package className="mr-1 h-3 w-3" />
                            <span className="text-xs">{item.name} ({item.quantity})</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Battle;
