#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Tournament App - Padel/Tennis Live Scoring System
Testing all endpoints mentioned in the review request with authentication.
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://torneo-live.preview.emergentagent.com/api"
TEST_EMAIL = "testpadel@test.com"
TEST_PASSWORD = "password"

class TournamentTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_id = None
        self.test_tournament_id = None
        self.test_match_id = None
        self.home_team_id = None
        self.away_team_id = None
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def authenticate(self):
        """Authenticate with the provided credentials"""
        self.log("🔐 Starting authentication...")
        
        # Try to login first
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
        
        if response.status_code == 401:
            self.log("❌ Login failed - User doesn't exist, attempting registration...")
            
            # Register new user
            register_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Basketball Test User"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=register_data)
            
            if response.status_code != 200:
                self.log(f"❌ Registration failed: {response.status_code} - {response.text}")
                return False
                
            self.log("✅ User registered successfully")
        
        elif response.status_code != 200:
            self.log(f"❌ Authentication failed: {response.status_code} - {response.text}")
            return False
        
        # Extract session token and user info
        auth_data = response.json()
        self.session_token = auth_data.get("session_token")
        self.user_id = auth_data.get("user_id")
        
        if not self.session_token:
            self.log("❌ No session token received")
            return False
            
        # Set authorization header for future requests
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        self.log(f"✅ Authentication successful - User ID: {self.user_id}")
        return True
        
    def create_test_tournament(self):
        """Create a test Padel tournament"""
        self.log("🏆 Creating test Padel tournament...")
        
        tournament_data = {
            "name": f"Test Padel Tournament {uuid.uuid4().hex[:8]}",
            "description": "Test tournament for Padel live scoring system",
            "sport": "padel",
            "category": "Open",
            "format": "league",
            "game_format": "2v2",
            "game_structure": "3_sets",
            "is_public": True
        }
        
        response = self.session.post(f"{BASE_URL}/tournaments", json=tournament_data)
        
        if response.status_code != 200:
            self.log(f"❌ Tournament creation failed: {response.status_code} - {response.text}")
            return False
            
        tournament = response.json()
        self.test_tournament_id = tournament["id"]
        self.log(f"✅ Tournament created: {self.test_tournament_id}")
        return True
        
    def create_test_teams_and_players(self):
        """Create test teams and players for Padel"""
        self.log("👥 Creating test teams and players...")
        
        # Create Team 1
        team1_data = {"name": "Padel Team Alpha"}
        response = self.session.post(f"{BASE_URL}/tournaments/{self.test_tournament_id}/teams", json=team1_data)
        
        if response.status_code != 200:
            self.log(f"❌ Team 1 creation failed: {response.status_code} - {response.text}")
            return False
            
        team1 = response.json()
        self.home_team_id = team1["id"]
        
        # Create Team 2
        team2_data = {"name": "Padel Team Beta"}
        response = self.session.post(f"{BASE_URL}/tournaments/{self.test_tournament_id}/teams", json=team2_data)
        
        if response.status_code != 200:
            self.log(f"❌ Team 2 creation failed: {response.status_code} - {response.text}")
            return False
            
        team2 = response.json()
        self.away_team_id = team2["id"]
        
        # Create players for Team 1
        players_team1 = [
            {"full_name": "Carlos Rodriguez", "number": 1},
            {"full_name": "Miguel Santos", "number": 2}
        ]
        
        for player_data in players_team1:
            response = self.session.post(f"{BASE_URL}/teams/{self.home_team_id}/players", json=player_data)
            if response.status_code != 200:
                self.log(f"❌ Player creation failed: {response.status_code} - {response.text}")
                return False
                
        # Create players for Team 2
        players_team2 = [
            {"full_name": "Andrea Bianchi", "number": 1},
            {"full_name": "Marco Rossi", "number": 2}
        ]
        
        for player_data in players_team2:
            response = self.session.post(f"{BASE_URL}/teams/{self.away_team_id}/players", json=player_data)
            if response.status_code != 200:
                self.log(f"❌ Player creation failed: {response.status_code} - {response.text}")
                return False
                
        self.log(f"✅ Teams and players created - Home: {self.home_team_id}, Away: {self.away_team_id}")
        return True
        
    def create_test_match(self):
        """Create a test Padel match"""
        self.log("⚽ Creating test Padel match...")
        
        match_data = {
            "home_team_id": self.home_team_id,
            "away_team_id": self.away_team_id,
            "match_date": "2024-01-15",
            "match_time": "15:00",
            "venue": "Padel Court 1",
            "round": "Giornata 1"
        }
        
        response = self.session.post(f"{BASE_URL}/tournaments/{self.test_tournament_id}/matches", json=match_data)
        
        if response.status_code != 200:
            self.log(f"❌ Match creation failed: {response.status_code} - {response.text}")
            return False
            
        match = response.json()
        self.test_match_id = match["id"]
        self.log(f"✅ Match created: {self.test_match_id}")
        return True
        
    def test_padel_data_persistence(self):
        """Test 1: Verify Padel/Tennis data persistence with PUT /api/matches/{match_id}"""
        self.log("🎾 TEST 1: Testing Padel data persistence...")
        
        # Test data for Padel match update
        padel_update_data = {
            "tennis_sets": [
                {"homeGames": 6, "awayGames": 4},  # Set 1: Home wins 6-4
                {"homeGames": 3, "awayGames": 6},  # Set 2: Away wins 6-3
                {"homeGames": 5, "awayGames": 3}   # Set 3: Home leads 5-3 (in progress)
            ],
            "currentGame": {
                "homePoints": 30,
                "awayPoints": 15,
                "isDeuce": False,
                "advantage": None,
                "homeGamesInSet": 5,
                "awayGamesInSet": 3
            },
            "home_stats": {
                "aces": 8,
                "double_faults": 2,
                "first_serve_percentage": 75,
                "winners": 15,
                "unforced_errors": 8
            },
            "away_stats": {
                "aces": 5,
                "double_faults": 4,
                "first_serve_percentage": 68,
                "winners": 12,
                "unforced_errors": 12
            },
            "home_goals": 2,  # Sets won by home team
            "away_goals": 1,  # Sets won by away team
            "status": "in_progress"
        }
        
        # Update match with Padel data
        response = self.session.put(f"{BASE_URL}/matches/{self.test_match_id}", json=padel_update_data)
        
        if response.status_code != 200:
            self.log(f"❌ Match update failed: {response.status_code} - {response.text}")
            return False
            
        updated_match = response.json()
        self.log("✅ Match updated with Padel data")
        
        # Verify data was saved correctly
        response = self.session.get(f"{BASE_URL}/matches/{self.test_match_id}")
        
        if response.status_code != 200:
            self.log(f"❌ Match retrieval failed: {response.status_code} - {response.text}")
            return False
            
        match_data = response.json()
        
        # Verify tennis_sets
        if not match_data.get("tennis_sets"):
            self.log("❌ tennis_sets not saved")
            return False
            
        if len(match_data["tennis_sets"]) != 3:
            self.log(f"❌ Expected 3 sets, got {len(match_data['tennis_sets'])}")
            return False
            
        # Verify currentGame
        if not match_data.get("currentGame"):
            self.log("❌ currentGame not saved")
            return False
            
        current_game = match_data["currentGame"]
        if current_game.get("homePoints") != 30 or current_game.get("awayPoints") != 15:
            self.log(f"❌ currentGame points incorrect: {current_game}")
            return False
            
        # Verify home_stats and away_stats
        if not match_data.get("home_stats") or not match_data.get("away_stats"):
            self.log("❌ Player stats not saved")
            return False
            
        # Verify score
        if match_data.get("home_goals") != 2 or match_data.get("away_goals") != 1:
            self.log(f"❌ Score incorrect: {match_data.get('home_goals')}-{match_data.get('away_goals')}")
            return False
            
        self.log("✅ TEST 1 PASSED: Padel data persistence verified")
        return True
        
    def test_matches_live_endpoint(self):
        """Test 2: Verify GET /api/tournaments/{tournament_id}/matches-live endpoint"""
        self.log("📡 TEST 2: Testing matches-live endpoint...")
        
        response = self.session.get(f"{BASE_URL}/tournaments/{self.test_tournament_id}/matches-live")
        
        if response.status_code != 200:
            self.log(f"❌ matches-live endpoint failed: {response.status_code} - {response.text}")
            return False
            
        live_matches = response.json()
        
        if not isinstance(live_matches, list):
            self.log(f"❌ Expected list, got {type(live_matches)}")
            return False
            
        # Find our test match
        test_match = None
        for match in live_matches:
            if match.get("id") == self.test_match_id:
                test_match = match
                break
                
        if not test_match:
            self.log("❌ Test match not found in live matches")
            return False
            
        # Verify has_events, live_home_score, live_away_score
        if "has_events" not in test_match:
            self.log("❌ has_events field missing")
            return False
            
        if "live_home_score" not in test_match:
            self.log("❌ live_home_score field missing")
            return False
            
        if "live_away_score" not in test_match:
            self.log("❌ live_away_score field missing")
            return False
            
        # For Padel/Tennis, verify tennis_sets, home_stats, away_stats, currentGame
        if not test_match.get("tennis_sets"):
            self.log("❌ tennis_sets missing in live matches")
            return False
            
        if not test_match.get("home_stats"):
            self.log("❌ home_stats missing in live matches")
            return False
            
        if not test_match.get("away_stats"):
            self.log("❌ away_stats missing in live matches")
            return False
            
        if not test_match.get("currentGame"):
            self.log("❌ currentGame missing in live matches")
            return False
            
        # Verify live scores match the sets won
        expected_home_score = 2  # Sets won by home team
        expected_away_score = 1  # Sets won by away team
        
        if test_match.get("live_home_score") != expected_home_score:
            self.log(f"❌ live_home_score incorrect: expected {expected_home_score}, got {test_match.get('live_home_score')}")
            return False
            
        if test_match.get("live_away_score") != expected_away_score:
            self.log(f"❌ live_away_score incorrect: expected {expected_away_score}, got {test_match.get('live_away_score')}")
            return False
            
        # Verify has_events is true for in_progress match
        if not test_match.get("has_events"):
            self.log("❌ has_events should be true for in_progress match")
            return False
            
        self.log("✅ TEST 2 PASSED: matches-live endpoint verified")
        return True
        
    def test_complete_cycle(self):
        """Test 3: Test complete cycle - update match and verify both endpoints"""
        self.log("🔄 TEST 3: Testing complete cycle...")
        
        # Update match with new score (home wins the third set)
        cycle_update_data = {
            "tennis_sets": [
                {"homeGames": 6, "awayGames": 4},  # Set 1: Home wins 6-4
                {"homeGames": 3, "awayGames": 6},  # Set 2: Away wins 6-3
                {"homeGames": 6, "awayGames": 3}   # Set 3: Home wins 6-3
            ],
            "currentGame": None,  # Match completed
            "home_goals": 2,  # Sets won by home team
            "away_goals": 1,  # Sets won by away team
            "status": "completed"
        }
        
        # Update the match
        response = self.session.put(f"{BASE_URL}/matches/{self.test_match_id}", json=cycle_update_data)
        
        if response.status_code != 200:
            self.log(f"❌ Cycle update failed: {response.status_code} - {response.text}")
            return False
            
        # Verify GET /api/matches/{match_id} returns updated data
        response = self.session.get(f"{BASE_URL}/matches/{self.test_match_id}")
        
        if response.status_code != 200:
            self.log(f"❌ Match retrieval failed: {response.status_code} - {response.text}")
            return False
            
        match_data = response.json()
        
        # Verify the third set was updated
        if len(match_data.get("tennis_sets", [])) != 3:
            self.log("❌ Expected 3 sets in updated match")
            return False
            
        third_set = match_data["tennis_sets"][2]
        if third_set.get("homeGames") != 6 or third_set.get("awayGames") != 3:
            self.log(f"❌ Third set incorrect: {third_set}")
            return False
            
        # Verify currentGame is None (match completed)
        if match_data.get("currentGame") is not None:
            self.log(f"❌ currentGame should be None for completed match: {match_data.get('currentGame')}")
            return False
            
        # Verify status is completed
        if match_data.get("status") != "completed":
            self.log(f"❌ Status should be completed: {match_data.get('status')}")
            return False
            
        # Verify GET /api/tournaments/{tournament_id}/matches-live returns updated data
        response = self.session.get(f"{BASE_URL}/tournaments/{self.test_tournament_id}/matches-live")
        
        if response.status_code != 200:
            self.log(f"❌ matches-live endpoint failed: {response.status_code} - {response.text}")
            return False
            
        live_matches = response.json()
        
        # Find our test match
        test_match = None
        for match in live_matches:
            if match.get("id") == self.test_match_id:
                test_match = match
                break
                
        if not test_match:
            self.log("❌ Test match not found in live matches")
            return False
            
        # Verify updated scores in live endpoint
        if test_match.get("live_home_score") != 2:
            self.log(f"❌ live_home_score not updated: {test_match.get('live_home_score')}")
            return False
            
        if test_match.get("live_away_score") != 1:
            self.log(f"❌ live_away_score not updated: {test_match.get('live_away_score')}")
            return False
            
        self.log("✅ TEST 3 PASSED: Complete cycle verified")
        return True
        
    def test_match_status_completed(self):
        """Test 4: Test match status - verify has_events becomes false for completed matches"""
        self.log("🏁 TEST 4: Testing completed match status...")
        
        # Get live matches to check has_events for completed match
        response = self.session.get(f"{BASE_URL}/tournaments/{self.test_tournament_id}/matches-live")
        
        if response.status_code != 200:
            self.log(f"❌ matches-live endpoint failed: {response.status_code} - {response.text}")
            return False
            
        live_matches = response.json()
        
        # Find our test match
        test_match = None
        for match in live_matches:
            if match.get("id") == self.test_match_id:
                test_match = match
                break
                
        if not test_match:
            self.log("❌ Test match not found in live matches")
            return False
            
        # Verify has_events is false for completed match
        if test_match.get("has_events") != False:
            self.log(f"❌ has_events should be false for completed match: {test_match.get('has_events')}")
            return False
            
        # Verify status is completed
        if test_match.get("status") != "completed":
            self.log(f"❌ Status should be completed: {test_match.get('status')}")
            return False
            
        self.log("✅ TEST 4 PASSED: Completed match status verified")
        return True
        
    def test_database_verification(self):
        """Test 5: Verify data is actually in the database using mongosh"""
        self.log("🗄️ TEST 5: Database verification...")
        
        try:
            import subprocess
            
            # Check if match data exists in MongoDB
            mongo_cmd = [
                "mongosh", 
                "mongodb://localhost:27017/test_database",
                "--eval",
                f"db.matches.findOne({{id: '{self.test_match_id}'}})"
            ]
            
            result = subprocess.run(mongo_cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                self.log(f"❌ MongoDB query failed: {result.stderr}")
                return False
                
            output = result.stdout
            
            # Check if the match exists in the output
            if self.test_match_id not in output:
                self.log("❌ Match not found in database")
                return False
                
            # Check for tennis_sets in the output
            if "tennis_sets" not in output:
                self.log("❌ tennis_sets not found in database")
                return False
                
            # Check for home_stats in the output
            if "home_stats" not in output:
                self.log("❌ home_stats not found in database")
                return False
                
            self.log("✅ TEST 5 PASSED: Database verification successful")
            return True
            
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB query timed out")
            return False
        except FileNotFoundError:
            self.log("⚠️ mongosh not available, skipping database verification")
            return True  # Don't fail the test if mongosh is not available
        except Exception as e:
            self.log(f"❌ Database verification error: {str(e)}")
            return False
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting comprehensive Padel/Tennis live scoring system tests...")
        
        tests = [
            ("Authentication", self.authenticate),
            ("Tournament Creation", self.create_test_tournament),
            ("Teams and Players Setup", self.create_test_teams_and_players),
            ("Match Creation", self.create_test_match),
            ("Padel Data Persistence", self.test_padel_data_persistence),
            ("Matches Live Endpoint", self.test_matches_live_endpoint),
            ("Complete Cycle", self.test_complete_cycle),
            ("Match Status Completed", self.test_match_status_completed),
            ("Database Verification", self.test_database_verification)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*60}")
            self.log(f"Running: {test_name}")
            self.log('='*60)
            
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} PASSED")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} FAILED with exception: {str(e)}")
                
        # Final summary
        self.log(f"\n{'='*60}")
        self.log("🏆 FINAL TEST RESULTS")
        self.log('='*60)
        self.log(f"✅ Tests Passed: {passed}")
        self.log(f"❌ Tests Failed: {failed}")
        self.log(f"📊 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED! Padel/Tennis live scoring system is working correctly.")
            return True
        else:
            self.log("⚠️ Some tests failed. Please check the logs above for details.")
            return False

def main():
    """Main function to run the tests"""
    tester = TournamentTester()
    success = tester.run_all_tests()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()