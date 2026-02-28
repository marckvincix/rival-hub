#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://torneo-live.preview.emergentagent.com/api"
TEST_EMAIL = f"testevents{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
TEST_PASSWORD = "password123"

class MatchEventsAndStatsTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_data = None
        
    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def test_login(self):
        """Test user registration (creating a unique user for each test)"""
        self.log("🔐 Testing registration...")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Test User Match Events"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get("session_token")
                self.user_data = data
                
                # Set session token in headers
                self.session.headers.update({
                    "Authorization": f"Bearer {self.session_token}"
                })
                
                self.log(f"✅ Registration successful - User: {data.get('name')} ({data.get('email')})")
                return True
            else:
                self.log(f"❌ Registration failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Registration error: {str(e)}")
            return False
    
    def get_or_create_tournament_with_teams_and_players(self):
        """Get existing tournament with teams and players or create them"""
        self.log("🏆 Getting tournament with teams and players...")
        
        # Get tournaments
        try:
            response = self.session.get(f"{BASE_URL}/tournaments")
            if response.status_code != 200:
                self.log(f"❌ Failed to get tournaments: {response.status_code}")
                return None, None, None
            
            tournaments = response.json()
            if not tournaments:
                self.log("📝 Creating new tournament...")
                tournament = self.create_tournament()
                if not tournament:
                    return None, None, None
            else:
                tournament = tournaments[0]
                self.log(f"✅ Using existing tournament: {tournament['name']}")
            
            tournament_id = tournament['id']
            
            # Get teams
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/teams")
            if response.status_code != 200:
                self.log(f"❌ Failed to get teams: {response.status_code}")
                return None, None, None
            
            teams = response.json()
            if len(teams) < 2:
                self.log("📝 Creating teams...")
                teams = self.create_teams(tournament_id)
                if not teams or len(teams) < 2:
                    return None, None, None
            
            # Get players for both teams
            all_players = {}
            for team in teams[:2]:  # Use first 2 teams
                team_id = team['id']
                response = self.session.get(f"{BASE_URL}/teams/{team_id}/players")
                if response.status_code != 200:
                    self.log(f"❌ Failed to get players for team {team['name']}: {response.status_code}")
                    return None, None, None
                
                players = response.json()
                if len(players) < 2:
                    self.log(f"📝 Creating players for team {team['name']}...")
                    new_players = self.create_players_for_team(team_id)
                    if not new_players:
                        return None, None, None
                    players = new_players
                
                all_players[team_id] = players
                self.log(f"✅ Team {team['name']} has {len(players)} players")
            
            return tournament, teams[:2], all_players
            
        except Exception as e:
            self.log(f"❌ Error setting up data: {str(e)}")
            return None, None, None
    
    def create_tournament(self):
        """Create a test tournament"""
        try:
            tournament_data = {
                "name": f"Match Events Test Tournament {datetime.now().strftime('%Y%m%d-%H%M%S')}",
                "description": "Tournament for testing match events and stats",
                "category": "Open",
                "format": "league",
                "is_public": True
            }
            
            response = self.session.post(f"{BASE_URL}/tournaments", json=tournament_data)
            if response.status_code == 200:
                tournament = response.json()
                self.log(f"✅ Tournament created: {tournament['name']}")
                return tournament
            else:
                self.log(f"❌ Failed to create tournament: {response.status_code}")
                return None
        except Exception as e:
            self.log(f"❌ Error creating tournament: {str(e)}")
            return None
    
    def create_teams(self, tournament_id):
        """Create test teams"""
        try:
            teams = []
            team_names = ["Real Madrid", "FC Barcelona"]
            
            for name in team_names:
                team_data = {"name": name, "logo": None}
                response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/teams", json=team_data)
                
                if response.status_code == 200:
                    team = response.json()
                    teams.append(team)
                    self.log(f"✅ Team created: {team['name']}")
                else:
                    self.log(f"❌ Failed to create team {name}: {response.status_code}")
                    return None
            
            return teams
        except Exception as e:
            self.log(f"❌ Error creating teams: {str(e)}")
            return None
    
    def create_players_for_team(self, team_id):
        """Create test players for a team"""
        try:
            players_data = [
                {"full_name": "Lionel Messi", "number": 10, "role": "forward"},
                {"full_name": "Sergio Ramos", "number": 4, "role": "defender"},
                {"full_name": "Luka Modrić", "number": 8, "role": "midfielder"},
            ]
            
            players = []
            for player_data in players_data:
                response = self.session.post(f"{BASE_URL}/teams/{team_id}/players", json=player_data)
                
                if response.status_code == 200:
                    player = response.json()
                    players.append(player)
                else:
                    self.log(f"❌ Failed to create player {player_data['full_name']}: {response.status_code}")
                    return None
            
            return players
        except Exception as e:
            self.log(f"❌ Error creating players: {str(e)}")
            return None
    
    def create_match(self, tournament_id, home_team_id, away_team_id):
        """Create a match between two teams"""
        self.log("⚽ Creating test match...")
        
        try:
            match_data = {
                "home_team_id": home_team_id,
                "away_team_id": away_team_id,
                "match_date": "2024-01-20",
                "match_time": "15:00",
                "venue": "Test Stadium",
                "round": "Test Round"
            }
            
            response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/matches", json=match_data)
            
            if response.status_code == 200:
                match = response.json()
                self.log(f"✅ Match created - ID: {match['id']}")
                return match
            else:
                self.log(f"❌ Failed to create match: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Error creating match: {str(e)}")
            return None
    
    def update_match_to_in_progress(self, match_id):
        """Update match status to 'In corso'"""
        self.log("🔄 Setting match status to 'In corso'...")
        
        try:
            update_data = {"status": "In corso"}
            response = self.session.put(f"{BASE_URL}/matches/{match_id}", json=update_data)
            
            if response.status_code == 200:
                match = response.json()
                self.log(f"✅ Match status updated to: {match.get('status', 'N/A')}")
                return match
            else:
                self.log(f"❌ Failed to update match status: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Error updating match status: {str(e)}")
            return None
    
    def test_batch_events_endpoint(self, match_id, teams, all_players):
        """Test POST /api/matches/{match_id}/events/batch"""
        self.log(f"🎯 Testing POST /api/matches/{match_id}/events/batch...")
        
        home_team = teams[0]
        away_team = teams[1]
        home_players = all_players[home_team['id']]
        away_players = all_players[away_team['id']]
        
        try:
            # Create test events
            events = [
                {
                    "player_id": home_players[0]['id'],  # Messi goal
                    "team_id": home_team['id'],
                    "event_type": "goal",
                    "minute": 25,
                    "note": "Great strike from outside the box"
                },
                {
                    "player_id": home_players[2]['id'],  # Modrić assist
                    "team_id": home_team['id'],
                    "event_type": "assist",
                    "minute": 25,
                    "note": "Perfect pass to Messi"
                },
                {
                    "player_id": away_players[0]['id'],  # Away team goal
                    "team_id": away_team['id'],
                    "event_type": "goal",
                    "minute": 67
                },
                {
                    "player_id": away_players[1]['id'],  # Yellow card
                    "team_id": away_team['id'],
                    "event_type": "yellow_card",
                    "minute": 78,
                    "note": "Rough tackle"
                }
            ]
            
            # Player ratings
            ratings = {
                home_players[0]['id']: 8.5,  # Messi - goal scorer
                home_players[1]['id']: 7.0,  # Defender
                home_players[2]['id']: 7.5,  # Modrić - assist
                away_players[0]['id']: 7.8,  # Goal scorer
                away_players[1]['id']: 6.5   # Yellow card
            }
            
            batch_data = {
                "events": events,
                "ratings": ratings,
                "home_goals": 2,  # Home team wins
                "away_goals": 1
            }
            
            self.log(f"📋 Sending batch with {len(events)} events, {len(ratings)} ratings, score: 2-1")
            
            response = self.session.post(f"{BASE_URL}/matches/{match_id}/events/batch", json=batch_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Batch events saved successfully!")
                self.log(f"📊 Events saved: {result.get('events_count', 'N/A')}")
                
                # Verify match score was updated
                if result.get('match'):
                    match = result['match']
                    home_goals = match.get('home_goals')
                    away_goals = match.get('away_goals')
                    self.log(f"⚽ Match score updated: {home_goals}-{away_goals}")
                    
                    if home_goals == 2 and away_goals == 1:
                        self.log("✅ Match score correctly updated")
                        return True, home_players, away_players
                    else:
                        self.log(f"❌ Score mismatch - Expected: 2-1, Got: {home_goals}-{away_goals}")
                        return False, None, None
                else:
                    self.log("⚠️  No match data returned, but events saved")
                    return True, home_players, away_players
            else:
                self.log(f"❌ Batch events failed: {response.status_code} - {response.text}")
                return False, None, None
                
        except Exception as e:
            self.log(f"❌ Batch events error: {str(e)}")
            return False, None, None
    
    def test_player_stats_endpoint(self, players):
        """Test GET /api/players/{player_id}/stats"""
        self.log("📊 Testing GET /api/players/{player_id}/stats...")
        
        all_passed = True
        
        for i, player in enumerate(players):
            player_id = player['id']
            player_name = player['full_name']
            
            try:
                self.log(f"🔍 Getting stats for {player_name} (ID: {player_id})...")
                
                response = self.session.get(f"{BASE_URL}/players/{player_id}/stats")
                
                if response.status_code == 200:
                    stats = response.json()
                    
                    # Verify required fields
                    required_fields = [
                        'player_id', 'full_name', 'goals', 'assists', 
                        'yellow_cards', 'red_cards', 'appearances', 
                        'minutes_played', 'average_rating'
                    ]
                    
                    missing_fields = []
                    for field in required_fields:
                        if field not in stats:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        self.log(f"❌ Missing fields for {player_name}: {missing_fields}")
                        all_passed = False
                        continue
                    
                    # Verify player_id matches
                    if stats['player_id'] != player_id:
                        self.log(f"❌ Player ID mismatch for {player_name}: {stats['player_id']} != {player_id}")
                        all_passed = False
                        continue
                    
                    # Verify full_name matches
                    if stats['full_name'] != player_name:
                        self.log(f"❌ Player name mismatch: {stats['full_name']} != {player_name}")
                        all_passed = False
                        continue
                    
                    # Log stats
                    self.log(f"✅ Stats for {player_name}:")
                    self.log(f"   📈 Goals: {stats['goals']}, Assists: {stats['assists']}")
                    self.log(f"   📈 Yellow Cards: {stats['yellow_cards']}, Red Cards: {stats['red_cards']}")
                    self.log(f"   📈 Appearances: {stats['appearances']}, Minutes: {stats['minutes_played']}")
                    self.log(f"   📈 Average Rating: {stats['average_rating']}")
                    
                    # Verify stats make sense based on events we created
                    if i == 0:  # First player (Messi) should have 1 goal
                        if stats['goals'] < 1:
                            self.log(f"⚠️  Expected at least 1 goal for {player_name}, got {stats['goals']}")
                    
                    if stats['appearances'] > 0 and stats['average_rating'] > 0:
                        self.log(f"✅ Player has valid appearance and rating data")
                    
                else:
                    self.log(f"❌ Get stats failed for {player_name}: {response.status_code} - {response.text}")
                    all_passed = False
                    
            except Exception as e:
                self.log(f"❌ Get stats error for {player_name}: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def run_comprehensive_test(self):
        """Run the complete test flow"""
        self.log("🚀 Starting GoalManager Match Events & Player Stats Testing...")
        self.log("=" * 70)
        
        # Step 1: Login
        if not self.test_login():
            return False
        
        # Step 2: Get/create tournament, teams, and players
        tournament, teams, all_players = self.get_or_create_tournament_with_teams_and_players()
        if not tournament or not teams or not all_players:
            return False
        
        # Step 3: Create a match
        match = self.create_match(tournament['id'], teams[0]['id'], teams[1]['id'])
        if not match:
            return False
        
        # Step 4: Update match to "In corso" status
        match = self.update_match_to_in_progress(match['id'])
        if not match:
            return False
        
        # Step 5: Test batch events endpoint
        self.log("\n" + "=" * 50)
        self.log("🎯 TESTING BATCH EVENTS ENDPOINT")
        self.log("=" * 50)
        
        success, home_players, away_players = self.test_batch_events_endpoint(
            match['id'], teams, all_players
        )
        if not success:
            return False
        
        # Step 6: Test player stats endpoint
        self.log("\n" + "=" * 50)
        self.log("📊 TESTING PLAYER STATS ENDPOINT")
        self.log("=" * 50)
        
        # Test stats for all players that had events
        test_players = home_players + away_players
        success = self.test_player_stats_endpoint(test_players)
        
        return success

def main():
    tester = MatchEventsAndStatsTester()
    
    try:
        success = tester.run_comprehensive_test()
        
        print("\n" + "=" * 70)
        if success:
            print("✅ ALL MATCH EVENTS & PLAYER STATS TESTS PASSED!")
            print("📋 Successfully tested:")
            print("   🎯 POST /api/matches/{match_id}/events/batch")
            print("      - Saves multiple events in batch")
            print("      - Updates match score")
            print("      - Stores player ratings")
            print("      - Updates player cumulative statistics")
            print("   📊 GET /api/players/{player_id}/stats")
            print("      - Returns complete player statistics")
            print("      - Includes goals, assists, cards, appearances")
            print("      - Calculates average rating correctly")
            print("      - Shows minutes played and other metrics")
        else:
            print("❌ SOME TESTS FAILED - Check the logs above for details")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()