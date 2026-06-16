import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Swords, Clock, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BattleTurn {
  id: string;
  turn_number: number;
  actor_type: string;
  action_type: string;
  skill_used: string | null;
  damage_dealt: number | null;
  attacker_hp: number;
  defender_hp: number;
  created_at: string;
}

interface Battle {
  id: string;
  attacker_id: string;
  defender_id: string;
  attacker_pet_id: string;
  defender_pet_id: string;
  status: string;
  winner_id: string | null;
  is_ai_battle: boolean;
}

interface RealtimeBattleSyncProps {
  battleId: string;
  isAttacker: boolean;
  onBattleEnd: (winnerId: string | null) => void;
  onOpponentTurn?: (turn: BattleTurn) => void;
  onTurnChange?: (isMyTurn: boolean) => void;
}

export const RealtimeBattleSync = ({ battleId, isAttacker, onBattleEnd, onOpponentTurn, onTurnChange }: RealtimeBattleSyncProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [turns, setTurns] = useState<BattleTurn[]>([]);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  useEffect(() => {
    if (!battleId || !user) return;

    // Fetch initial battle state
    fetchBattleState();

    // Subscribe to battle updates
    const battleChannel = supabase
      .channel(`battle-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`
        },
        (payload) => {
          console.log('Battle updated:', payload);
          setBattle(payload.new as Battle);
          
          if (payload.new.status === 'completed') {
            onBattleEnd(payload.new.winner_id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_turns',
          filter: `battle_id=eq.${battleId}`
        },
        (payload) => {
          console.log('New turn:', payload);
          const newTurn = payload.new as BattleTurn;
          setTurns(prev => [...prev, newTurn]);
          
          // Show notification for opponent's turn
          const isMyTurn = isAttacker ? newTurn.actor_type === 'defender' : newTurn.actor_type === 'attacker';
          if (isMyTurn) {
            toast({
              title: "Opponent's Turn",
              description: `${newTurn.action_type} - Damage: ${newTurn.damage_dealt || 0}`,
            });
            setWaitingForOpponent(false);
            if (onOpponentTurn) {
              onOpponentTurn(newTurn);
            }
          }
          if (onTurnChange) {
            onTurnChange(isMyTurn);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(battleChannel);
    };
  }, [battleId, user, isAttacker, onBattleEnd]);

  const fetchBattleState = async () => {
    if (!battleId) return;

    const { data: battleData } = await supabase
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleData) {
      setBattle(battleData);
    }

    const { data: turnsData } = await supabase
      .from('battle_turns')
      .select('*')
      .eq('battle_id', battleId)
      .order('turn_number', { ascending: true });

    if (turnsData) {
      setTurns(turnsData);
    }
  };

  if (!battle) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading battle...</div>
        </CardContent>
      </Card>
    );
  }

  const lastTurn = turns[turns.length - 1];
  const myTurn = isAttacker 
    ? !lastTurn || lastTurn.actor_type === 'defender'
    : !lastTurn || lastTurn.actor_type === 'attacker';

  useEffect(() => {
    if (onTurnChange) {
      onTurnChange(myTurn);
    }
  }, [myTurn, onTurnChange]);

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            PVP Battle in Progress
          </CardTitle>
          {battle.status === 'completed' ? (
            <Badge variant={battle.winner_id === user?.id ? "default" : "destructive"}>
              <Trophy className="w-3 h-3 mr-1" />
              {battle.winner_id === user?.id ? "Victory!" : "Defeat"}
            </Badge>
          ) : myTurn ? (
            <Badge variant="default" className="gap-1">
              Your Turn
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 animate-pulse">
              <Clock className="w-3 h-3" />
              Waiting...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Battle Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Attacker HP</span>
            <span>{lastTurn?.attacker_hp || 100}</span>
          </div>
          <Progress value={lastTurn?.attacker_hp || 100} className="h-2" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Defender HP</span>
            <span>{lastTurn?.defender_hp || 100}</span>
          </div>
          <Progress value={lastTurn?.defender_hp || 100} className="h-2" />
        </div>

        {/* Battle Log */}
        <div className="border rounded-lg p-3 h-40 overflow-y-auto">
          <div className="space-y-2">
            {turns.map((turn) => (
              <div key={turn.id} className="text-sm">
                <span className="font-semibold">
                  Turn {turn.turn_number}:
                </span>{" "}
                <span className={turn.actor_type === (isAttacker ? 'attacker' : 'defender') ? 'text-primary' : 'text-muted-foreground'}>
                  {turn.action_type}
                  {turn.skill_used && ` (${turn.skill_used})`}
                  {turn.damage_dealt && ` - ${turn.damage_dealt} damage`}
                </span>
              </div>
            ))}
            {turns.length === 0 && (
              <p className="text-center text-muted-foreground">
                Battle starting...
              </p>
            )}
          </div>
        </div>

        {waitingForOpponent && (
          <div className="text-center text-sm text-muted-foreground animate-pulse">
            Waiting for opponent's move...
          </div>
        )}
      </CardContent>
    </Card>
  );
};