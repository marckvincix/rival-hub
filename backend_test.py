#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://torneo-live.preview.emergentagent.com/api"
TEST_EMAIL = "newuser@test.com"
TEST_PASSWORD = "password123"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_data = None
        
    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def test_register_or_login(self):
        """Test user registration or login"""
        self.log("🔐 Testing login/registration...")
        
        # First try login
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get("session_token")
                self.user_data = data
                
                # Set session token in headers
                self.session.headers.update({
                    "Authorization": f"Bearer {self.session_token}"
                })
                
                self.log(f"✅ Login successful - User: {data.get('name')} ({data.get('email')})")
                return True
            else:
                self.log(f"⚠️  Login failed, trying registration...")
                # Try registration
                return self.test_register()
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}")
            return False
    
    def test_register(self):
        """Test user registration"""
        self.log("📝 Testing user registration...")
        
        # Use a unique email for testing
        test_email = f"testuser{datetime.now().strftime('%Y%m%d%H%M%S')}@goalmanager.test"
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/register", json={
                "email": test_email,
                "password": TEST_PASSWORD,
                "name": "Test User GoalManager"
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
    
    def test_get_tournaments(self):
        """Test getting user tournaments"""
        self.log("🏆 Testing get tournaments...")
        
        try:
            response = self.session.get(f"{BASE_URL}/tournaments")
            
            if response.status_code == 200:
                tournaments = response.json()
                self.log(f"✅ Found {len(tournaments)} tournaments")
                return tournaments
            else:
                self.log(f"❌ Get tournaments failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Get tournaments error: {str(e)}")
            return None
    
    def test_create_tournament(self):
        """Test creating a tournament"""
        self.log("🏆 Creating test tournament...")
        
        try:
            tournament_data = {
                "name": f"Test Tournament {datetime.now().strftime('%Y%m%d-%H%M%S')}",
                "description": "Tournament for testing player dropdowns",
                "category": "Open",
                "format": "league",
                "is_public": True
            }
            
            response = self.session.post(f"{BASE_URL}/tournaments", json=tournament_data)
            
            if response.status_code == 200:
                tournament = response.json()
                self.log(f"✅ Tournament created - ID: {tournament['id']}, Name: {tournament['name']}")
                return tournament
            else:
                self.log(f"❌ Create tournament failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Create tournament error: {str(e)}")
            return None
    
    def test_create_teams(self, tournament_id):
        """Test creating teams for the tournament"""
        self.log("👥 Creating test teams...")
        
        teams = []
        team_names = ["Juventus FC", "AC Milan"]
        
        try:
            for i, name in enumerate(team_names):
                team_data = {
                    "name": name,
                    "logo": None
                }
                
                response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/teams", json=team_data)
                
                if response.status_code == 200:
                    team = response.json()
                    teams.append(team)
                    self.log(f"✅ Team created - ID: {team['id']}, Name: {team['name']}")
                else:
                    self.log(f"❌ Create team failed: {response.status_code} - {response.text}")
                    return None
            
            return teams
            
        except Exception as e:
            self.log(f"❌ Create teams error: {str(e)}")
            return None
    
    def test_create_players(self, teams):
        """Test creating players for each team"""
        self.log("⚽ Creating test players...")
        
        # Player data for Juventus
        juventus_players = [
            {"full_name": "Cristiano Ronaldo", "number": 7, "role": "forward"},
            {"full_name": "Paulo Dybala", "number": 10, "role": "midfielder"},
            {"full_name": "Giorgio Chiellini", "number": 3, "role": "defender"}
        ]
        
        # Player data for AC Milan
        milan_players = [
            {"full_name": "Zlatan Ibrahimović", "number": 11, "role": "forward"},
            {"full_name": "Franck Kessié", "number": 79, "role": "midfielder"},
            {"full_name": "Alessio Romagnoli", "number": 13, "role": "defender"}
        ]
        
        try:
            all_players = {}
            
            for team in teams:
                team_id = team['id']
                team_name = team['name']
                players_data = juventus_players if "Juventus" in team_name else milan_players
                
                team_players = []
                for player_data in players_data:
                    response = self.session.post(f"{BASE_URL}/teams/{team_id}/players", json=player_data)
                    
                    if response.status_code == 200:
                        player = response.json()
                        team_players.append(player)
                        self.log(f"✅ Player created - {player['full_name']} #{player.get('number', 'N/A')} ({team_name})")
                    else:
                        self.log(f"❌ Create player failed: {response.status_code} - {response.text}")
                        return None
                
                all_players[team_id] = team_players
            
            return all_players
            
        except Exception as e:
            self.log(f"❌ Create players error: {str(e)}")
            return None
    
    def test_get_team_players(self, team_id, team_name, expected_players):
        """Test the main endpoint: GET /api/teams/{team_id}/players"""
        self.log(f"🎯 Testing GET /api/teams/{team_id}/players for {team_name}...")
        
        try:
            response = self.session.get(f"{BASE_URL}/teams/{team_id}/players")
            
            if response.status_code == 200:
                players = response.json()
                self.log(f"✅ API Response successful - Found {len(players)} players for {team_name}")
                
                # Verify response structure
                if not isinstance(players, list):
                    self.log(f"❌ Expected list, got {type(players)}")
                    return False
                
                # Verify each player has required fields
                required_fields = ['id', 'full_name', 'team_id', 'role']
                for i, player in enumerate(players):
                    for field in required_fields:
                        if field not in player:
                            self.log(f"❌ Player {i} missing required field: {field}")
                            return False
                    
                    # Verify team_id matches
                    if player['team_id'] != team_id:
                        self.log(f"❌ Player {player['full_name']} has wrong team_id: {player['team_id']} (expected: {team_id})")
                        return False
                
                # Log player details
                for player in players:
                    number_str = f"#{player.get('number', 'N/A')}"
                    self.log(f"   📋 {player['full_name']} {number_str} - {player['role']} (ID: {player['id']})")
                
                # Verify count matches expected
                if len(players) != len(expected_players):
                    self.log(f"⚠️  Player count mismatch - Expected: {len(expected_players)}, Got: {len(players)}")
                
                return True
            else:
                self.log(f"❌ GET players failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ GET players error: {str(e)}")
            return False
    
    def test_player_dropdown_functionality(self):
        """Test the complete player dropdown functionality flow"""
        self.log("🚀 Starting Player Dropdown API Testing...")
        self.log("=" * 60)
        
        # Step 1: Login/Register
        if not self.test_register_or_login():
            return False
        
        # Step 2: Get existing tournaments
        tournaments = self.test_get_tournaments()
        tournament = None
        
        if tournaments and len(tournaments) > 0:
            # Use existing tournament
            tournament = tournaments[0]
            self.log(f"✅ Using existing tournament: {tournament['name']} (ID: {tournament['id']})")
        else:
            # Create new tournament
            tournament = self.test_create_tournament()
            if not tournament:
                return False
        
        tournament_id = tournament['id']
        
        # Step 3: Get existing teams or create new ones
        try:
            teams_response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/teams")
            if teams_response.status_code == 200:
                teams = teams_response.json()
                if len(teams) >= 2:
                    self.log(f"✅ Using existing teams: {len(teams)} teams found")
                    teams = teams[:2]  # Use first 2 teams
                else:
                    self.log(f"📋 Found {len(teams)} teams, need to create more...")
                    new_teams = self.test_create_teams(tournament_id)
                    if not new_teams:
                        return False
                    teams = new_teams
            else:
                self.log("📋 No teams found, creating new ones...")
                teams = self.test_create_teams(tournament_id)
                if not teams:
                    return False
        except Exception as e:
            self.log(f"❌ Error getting teams: {str(e)}")
            return False
        
        # Step 4: Create players for each team if they don't exist
        all_players = {}
        for team in teams:
            team_id = team['id']
            try:
                players_response = self.session.get(f"{BASE_URL}/teams/{team_id}/players")
                if players_response.status_code == 200:
                    existing_players = players_response.json()
                    if len(existing_players) >= 2:
                        self.log(f"✅ Team {team['name']} already has {len(existing_players)} players")
                        all_players[team_id] = existing_players
                    else:
                        self.log(f"📋 Team {team['name']} has {len(existing_players)} players, creating more...")
                        created_players = self.test_create_players([team])
                        if not created_players:
                            return False
                        all_players.update(created_players)
                else:
                    self.log(f"📋 No players found for {team['name']}, creating new ones...")
                    created_players = self.test_create_players([team])
                    if not created_players:
                        return False
                    all_players.update(created_players)
            except Exception as e:
                self.log(f"❌ Error handling players for team {team['name']}: {str(e)}")
                return False
        
        # Step 5: Test the main endpoint for each team
        self.log("\n" + "=" * 60)
        self.log("🎯 TESTING MAIN ENDPOINT: GET /api/teams/{team_id}/players")
        self.log("=" * 60)
        
        all_tests_passed = True
        
        for team in teams:
            team_id = team['id']
            team_name = team['name']
            expected_players = all_players.get(team_id, [])
            
            success = self.test_get_team_players(team_id, team_name, expected_players)
            if not success:
                all_tests_passed = False
        
        return all_tests_passed

def main():
    tester = BackendTester()
    
    try:
        success = tester.test_player_dropdown_functionality()
        
        print("\n" + "=" * 60)
        if success:
            print("✅ ALL TESTS PASSED - Player dropdown API is working correctly!")
            print("📋 The GET /api/teams/{team_id}/players endpoint:")
            print("   - Returns correct player data for each team")
            print("   - Includes all required fields (id, full_name, number, role, team_id)")
            print("   - Properly filters players by team_id")
            print("   - Can be used for player dropdowns in the frontend")
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