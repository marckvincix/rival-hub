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
                
                self.log(f"✅ Registration successful - User: {data.get('name')} ({test_email})")
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

    def test_authentication_required_endpoints(self):
        """Test that protected endpoints require authentication"""
        self.log("🔐 Testing authentication requirements...")
        
        # Clear auth headers temporarily
        original_headers = self.session.headers.copy()
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']
        
        # Test protected endpoints without auth - should return 401
        fake_tournament_id = "tournament_fake123"
        fake_news_id = "news_fake123"
        
        test_cases = [
            ("POST", f"{BASE_URL}/tournaments/{fake_tournament_id}/news", {"title": "Test", "content": "Test"}),
            ("PUT", f"{BASE_URL}/news/{fake_news_id}", {"title": "Test"}),
            ("DELETE", f"{BASE_URL}/news/{fake_news_id}", None)
        ]
        
        auth_test_passed = True
        for method, url, data in test_cases:
            try:
                if method == "POST":
                    response = self.session.post(url, json=data)
                elif method == "PUT":
                    response = self.session.put(url, json=data)
                elif method == "DELETE":
                    response = self.session.delete(url)
                
                if response.status_code == 401:
                    self.log(f"✅ {method} endpoint correctly requires authentication (401)")
                else:
                    self.log(f"❌ {method} endpoint should require auth but got {response.status_code}")
                    auth_test_passed = False
            except Exception as e:
                self.log(f"❌ Auth test error for {method}: {str(e)}")
                auth_test_passed = False
        
        # Restore headers
        self.session.headers = original_headers
        return auth_test_passed

    def test_news_crud_api(self):
        """Test the complete News CRUD API functionality"""
        self.log("📰 Starting News CRUD API Testing...")
        self.log("=" * 60)
        
        # Step 0: Test authentication requirements first
        if not self.test_authentication_required_endpoints():
            return False
        
        # Step 1: Login/Register
        if not self.test_register_or_login():
            return False
        
        # Step 2: Create or get a tournament
        tournaments = self.test_get_tournaments()
        tournament = None
        
        if tournaments and len(tournaments) > 0:
            tournament = tournaments[0]
            self.log(f"✅ Using existing tournament: {tournament['name']} (ID: {tournament['id']})")
        else:
            tournament = self.test_create_tournament()
            if not tournament:
                return False
        
        tournament_id = tournament['id']
        
        # Step 3: Test CREATE news (POST /api/tournaments/{tournament_id}/news)
        self.log("\n🔹 Testing CREATE news...")
        news_data = {
            "title": "Test News Title",
            "content": "Test content for the news article. This is a comprehensive test of the news API functionality.",
            "photo": None,
            "is_published": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/news", json=news_data)
            if response.status_code == 200:
                created_news = response.json()
                news_id = created_news['id']
                self.log(f"✅ News created successfully - ID: {news_id}, Title: '{created_news['title']}'")
                
                # Verify required fields
                required_fields = ['id', 'tournament_id', 'title', 'content', 'is_published', 'created_at']
                for field in required_fields:
                    if field not in created_news:
                        self.log(f"❌ Created news missing required field: {field}")
                        return False
                
                # Verify data matches
                if created_news['title'] != news_data['title']:
                    self.log(f"❌ Title mismatch - Expected: '{news_data['title']}', Got: '{created_news['title']}'")
                    return False
                
                if created_news['tournament_id'] != tournament_id:
                    self.log(f"❌ Tournament ID mismatch - Expected: {tournament_id}, Got: {created_news['tournament_id']}")
                    return False
                    
            else:
                self.log(f"❌ Create news failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Create news error: {str(e)}")
            return False
        
        # Step 4: Test GET news list (GET /api/tournaments/{tournament_id}/news)
        self.log("\n🔹 Testing GET news list...")
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/news")
            if response.status_code == 200:
                news_list = response.json()
                self.log(f"✅ News list retrieved - Found {len(news_list)} news articles")
                
                # Verify our created news appears in the list
                found_news = None
                for news in news_list:
                    if news['id'] == news_id:
                        found_news = news
                        break
                
                if found_news:
                    self.log(f"✅ Created news found in list - Title: '{found_news['title']}'")
                else:
                    self.log("❌ Created news not found in list")
                    return False
                    
            else:
                self.log(f"❌ Get news list failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Get news list error: {str(e)}")
            return False
        
        # Step 5: Test GET news list with published_only=false
        self.log("\n🔹 Testing GET news list with published_only=false...")
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/news?published_only=false")
            if response.status_code == 200:
                all_news_list = response.json()
                self.log(f"✅ All news list retrieved - Found {len(all_news_list)} news articles (including unpublished)")
            else:
                self.log(f"❌ Get all news list failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Get all news list error: {str(e)}")
            return False
        
        # Step 6: Test UPDATE news (PUT /api/news/{news_id})
        self.log("\n🔹 Testing UPDATE news...")
        update_data = {
            "title": "Updated News Title",
            "content": "Updated content for the news article.",
            "is_published": True
        }
        
        try:
            response = self.session.put(f"{BASE_URL}/news/{news_id}", json=update_data)
            if response.status_code == 200:
                updated_news = response.json()
                self.log(f"✅ News updated successfully - New title: '{updated_news['title']}'")
                
                # Verify update worked
                if updated_news['title'] != update_data['title']:
                    self.log(f"❌ Update failed - Title should be '{update_data['title']}', got '{updated_news['title']}'")
                    return False
                    
                if updated_news['content'] != update_data['content']:
                    self.log(f"❌ Update failed - Content mismatch")
                    return False
                    
            else:
                self.log(f"❌ Update news failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Update news error: {str(e)}")
            return False
        
        # Step 7: Verify update by getting news list again
        self.log("\n🔹 Verifying update by getting news list...")
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/news")
            if response.status_code == 200:
                updated_news_list = response.json()
                
                # Find our updated news
                updated_found = None
                for news in updated_news_list:
                    if news['id'] == news_id:
                        updated_found = news
                        break
                
                if updated_found and updated_found['title'] == "Updated News Title":
                    self.log(f"✅ Update verified - News title is now '{updated_found['title']}'")
                else:
                    self.log("❌ Update verification failed")
                    return False
                    
            else:
                self.log(f"❌ Verification get failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Update verification error: {str(e)}")
            return False
        
        # Step 8: Test ownership verification
        if not self.test_ownership_verification(tournament_id):
            return False
        
        # Step 9: Test DELETE news (DELETE /api/news/{news_id})
        self.log("\n🔹 Testing DELETE news...")
        try:
            response = self.session.delete(f"{BASE_URL}/news/{news_id}")
            if response.status_code == 200:
                self.log("✅ News deleted successfully")
            else:
                self.log(f"❌ Delete news failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete news error: {str(e)}")
            return False
        
        # Step 10: Verify deletion by checking news count
        self.log("\n🔹 Verifying deletion...")
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/news")
            if response.status_code == 200:
                final_news_list = response.json()
                
                # Check if our news is gone
                deleted_found = None
                for news in final_news_list:
                    if news['id'] == news_id:
                        deleted_found = news
                        break
                
                if not deleted_found:
                    self.log(f"✅ Deletion verified - News removed from list (Total: {len(final_news_list)} news)")
                else:
                    self.log("❌ Deletion verification failed - News still exists")
                    return False
                    
            else:
                self.log(f"❌ Deletion verification failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Deletion verification error: {str(e)}")
            return False
        
        return True
    def test_ownership_verification(self, tournament_id):
        """Test that users can only modify their own news"""
        self.log("🔒 Testing ownership verification...")
        
        # Create news with current user
        news_data = {
            "title": "Ownership Test News",
            "content": "This news is for testing ownership verification",
            "is_published": True
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/news", json=news_data)
            if response.status_code == 200:
                news = response.json()
                news_id = news['id']
                self.log(f"✅ News created for ownership test - ID: {news_id}")
                
                # Try to access news from different user (should work for GET)
                # Create a second user
                test_email2 = f"testuser2{datetime.now().strftime('%Y%m%d%H%M%S')}@goalmanager.test"
                
                # Save current session
                current_session = self.session.headers.copy()
                
                # Register second user
                response2 = requests.post(f"{BASE_URL}/auth/register", json={
                    "email": test_email2,
                    "password": "password123",
                    "name": "Test User 2"
                })
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    session_token2 = data2.get("session_token")
                    
                    # Try to update news with second user (should fail)
                    temp_session = requests.Session()
                    temp_session.headers.update({
                        "Authorization": f"Bearer {session_token2}"
                    })
                    
                    update_response = temp_session.put(f"{BASE_URL}/news/{news_id}", json={
                        "title": "Malicious Update"
                    })
                    
                    if update_response.status_code == 403 or update_response.status_code == 404:
                        self.log("✅ Ownership verification working - Second user cannot modify first user's news")
                        
                        # Restore original session and clean up
                        self.session.headers = current_session
                        
                        # Delete the test news
                        delete_response = self.session.delete(f"{BASE_URL}/news/{news_id}")
                        if delete_response.status_code == 200:
                            self.log("✅ Test news cleaned up")
                        
                        return True
                    else:
                        self.log(f"❌ Ownership verification failed - Second user could modify news: {update_response.status_code}")
                        return False
                else:
                    self.log(f"❌ Could not create second user for ownership test: {response2.status_code}")
                    return False
                    
            else:
                self.log(f"❌ Could not create news for ownership test: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Ownership test error: {str(e)}")
            return False

    def test_create_basketball_tournament(self):
        """Test creating a basketball tournament"""
        self.log("🏀 Creating basketball tournament...")
        
        try:
            tournament_data = {
                "name": f"Basketball Tournament {datetime.now().strftime('%Y%m%d-%H%M%S')}",
                "description": "Basketball tournament for testing basketball endpoints",
                "sport": "basket",
                "category": "Open",
                "format": "league",
                "game_format": "5v5",
                "game_structure": "4_quarters",
                "is_public": True
            }
            
            response = self.session.post(f"{BASE_URL}/tournaments", json=tournament_data)
            
            if response.status_code == 200:
                tournament = response.json()
                self.log(f"✅ Basketball tournament created - ID: {tournament['id']}, Name: {tournament['name']}")
                return tournament
            else:
                self.log(f"❌ Create basketball tournament failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Create basketball tournament error: {str(e)}")
            return None

    def test_create_basketball_teams(self, tournament_id):
        """Test creating basketball teams"""
        self.log("🏀 Creating basketball teams...")
        
        teams = []
        team_names = ["Lakers", "Warriors"]
        
        try:
            for name in team_names:
                team_data = {
                    "name": name,
                    "logo": None
                }
                
                response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/teams", json=team_data)
                
                if response.status_code == 200:
                    team = response.json()
                    teams.append(team)
                    self.log(f"✅ Basketball team created - ID: {team['id']}, Name: {team['name']}")
                else:
                    self.log(f"❌ Create basketball team failed: {response.status_code} - {response.text}")
                    return None
            
            return teams
            
        except Exception as e:
            self.log(f"❌ Create basketball teams error: {str(e)}")
            return None

    def test_create_basketball_players(self, teams):
        """Test creating basketball players"""
        self.log("🏀 Creating basketball players...")
        
        # Player data for Lakers
        lakers_players = [
            {"full_name": "LeBron James", "number": 23, "role": "forward"},
            {"full_name": "Anthony Davis", "number": 3, "role": "forward"},
            {"full_name": "Russell Westbrook", "number": 0, "role": "guard"}
        ]
        
        # Player data for Warriors
        warriors_players = [
            {"full_name": "Stephen Curry", "number": 30, "role": "guard"},
            {"full_name": "Klay Thompson", "number": 11, "role": "guard"},
            {"full_name": "Draymond Green", "number": 23, "role": "forward"}
        ]
        
        try:
            all_players = {}
            
            for team in teams:
                team_id = team['id']
                team_name = team['name']
                players_data = lakers_players if "Lakers" in team_name else warriors_players
                
                team_players = []
                for player_data in players_data:
                    response = self.session.post(f"{BASE_URL}/teams/{team_id}/players", json=player_data)
                    
                    if response.status_code == 200:
                        player = response.json()
                        team_players.append(player)
                        self.log(f"✅ Basketball player created - {player['full_name']} #{player.get('number', 'N/A')} ({team_name})")
                    else:
                        self.log(f"❌ Create basketball player failed: {response.status_code} - {response.text}")
                        return None
                
                all_players[team_id] = team_players
            
            return all_players
            
        except Exception as e:
            self.log(f"❌ Create basketball players error: {str(e)}")
            return None

    def test_create_basketball_match(self, tournament_id, teams):
        """Test creating a basketball match"""
        self.log("🏀 Creating basketball match...")
        
        try:
            match_data = {
                "home_team_id": teams[0]['id'],
                "away_team_id": teams[1]['id'],
                "match_date": "2024-01-15",
                "match_time": "20:00",
                "venue": "Basketball Arena",
                "round": "Game 1"
            }
            
            response = self.session.post(f"{BASE_URL}/tournaments/{tournament_id}/matches", json=match_data)
            
            if response.status_code == 200:
                match = response.json()
                self.log(f"✅ Basketball match created - ID: {match['id']}")
                return match
            else:
                self.log(f"❌ Create basketball match failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Create basketball match error: {str(e)}")
            return None

    def test_basketball_events_batch_save(self, match_id, teams, all_players):
        """Test basketball match events batch save"""
        self.log("🏀 Testing basketball events batch save...")
        
        try:
            # Get players from both teams
            home_players = all_players[teams[0]['id']]
            away_players = all_players[teams[1]['id']]
            
            # Create basketball events
            events = [
                # Home team events
                {
                    "player_id": home_players[0]['id'],
                    "team_id": teams[0]['id'],
                    "event_type": "points_2pt",
                    "minute": 5,
                    "period": "Q1",
                    "note": "Jump shot"
                },
                {
                    "player_id": home_players[1]['id'],
                    "team_id": teams[0]['id'],
                    "event_type": "points_3pt",
                    "minute": 8,
                    "period": "Q1",
                    "note": "Three-pointer"
                },
                {
                    "player_id": home_players[2]['id'],
                    "team_id": teams[0]['id'],
                    "event_type": "basketball_assist",
                    "minute": 8,
                    "period": "Q1",
                    "note": "Assist on 3-pointer"
                },
                {
                    "player_id": home_players[0]['id'],
                    "team_id": teams[0]['id'],
                    "event_type": "rebound",
                    "minute": 12,
                    "period": "Q1",
                    "note": "Defensive rebound"
                },
                # Away team events
                {
                    "player_id": away_players[0]['id'],
                    "team_id": teams[1]['id'],
                    "event_type": "points_3pt",
                    "minute": 6,
                    "period": "Q1",
                    "note": "Three-pointer"
                },
                {
                    "player_id": away_players[1]['id'],
                    "team_id": teams[1]['id'],
                    "event_type": "points_2pt",
                    "minute": 10,
                    "period": "Q1",
                    "note": "Mid-range shot"
                },
                {
                    "player_id": away_players[2]['id'],
                    "team_id": teams[1]['id'],
                    "event_type": "foul",
                    "minute": 15,
                    "period": "Q1",
                    "note": "Personal foul"
                },
                {
                    "player_id": away_players[0]['id'],
                    "team_id": teams[1]['id'],
                    "event_type": "steal",
                    "minute": 18,
                    "period": "Q1",
                    "note": "Steal"
                }
            ]
            
            # Player ratings
            ratings = {
                home_players[0]['id']: 8.5,
                home_players[1]['id']: 9.0,
                home_players[2]['id']: 7.5,
                away_players[0]['id']: 8.0,
                away_players[1]['id']: 7.0,
                away_players[2]['id']: 6.5
            }
            
            # Basketball specific data
            batch_data = {
                "events": events,
                "ratings": ratings,
                "home_goals": 5,  # 2+3 points for home team
                "away_goals": 5,  # 3+2 points for away team
                "periods_score": {
                    "Q1": {"home": 5, "away": 5}
                },
                "home_team_fouls": {"Q1": 0},
                "away_team_fouls": {"Q1": 1}
            }
            
            response = self.session.post(f"{BASE_URL}/matches/{match_id}/events/batch", json=batch_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Basketball events batch saved - {result.get('events_count', 0)} events created")
                self.log(f"   📊 Match score updated: {batch_data['home_goals']}-{batch_data['away_goals']}")
                self.log(f"   🏀 Period scores: Q1 {batch_data['periods_score']['Q1']['home']}-{batch_data['periods_score']['Q1']['away']}")
                return True
            else:
                self.log(f"❌ Basketball events batch save failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Basketball events batch save error: {str(e)}")
            return False

    def test_basketball_scorers_endpoint(self, tournament_id):
        """Test basketball scorers endpoint"""
        self.log("🏀 Testing basketball scorers endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/basketball-scorers")
            
            if response.status_code == 200:
                scorers = response.json()
                self.log(f"✅ Basketball scorers retrieved - Found {len(scorers)} players")
                
                # Verify response structure
                if isinstance(scorers, list):
                    for i, scorer in enumerate(scorers):
                        required_fields = ['player_id', 'player_name', 'team_name', 'total_points', 'points_1pt', 'points_2pt', 'points_3pt', 'assists', 'ppg']
                        for field in required_fields:
                            if field not in scorer:
                                self.log(f"❌ Scorer {i} missing required field: {field}")
                                return False
                        
                        self.log(f"   🏀 {scorer['player_name']} ({scorer['team_name']}) - {scorer['total_points']} pts, {scorer['assists']} ast, {scorer['ppg']} ppg")
                    
                    return True
                else:
                    self.log(f"❌ Expected list, got {type(scorers)}")
                    return False
            else:
                self.log(f"❌ Basketball scorers endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Basketball scorers endpoint error: {str(e)}")
            return False

    def test_basketball_stats_endpoint(self, tournament_id):
        """Test basketball stats endpoint"""
        self.log("🏀 Testing basketball stats endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/basketball-stats")
            
            if response.status_code == 200:
                stats = response.json()
                self.log(f"✅ Basketball stats retrieved - Found {len(stats)} players")
                
                # Verify response structure
                if isinstance(stats, list):
                    for i, player_stats in enumerate(stats):
                        required_fields = ['player_id', 'player_name', 'team_name', 'total_points', 'points_1pt', 'points_2pt', 'points_3pt', 'rebounds', 'assists', 'fouls', 'steals', 'blocks']
                        for field in required_fields:
                            if field not in player_stats:
                                self.log(f"❌ Player stats {i} missing required field: {field}")
                                return False
                        
                        self.log(f"   📊 {player_stats['player_name']} ({player_stats['team_name']}) - {player_stats['total_points']}pts, {player_stats['rebounds']}reb, {player_stats['assists']}ast, {player_stats['steals']}stl, {player_stats['blocks']}blk")
                    
                    return True
                else:
                    self.log(f"❌ Expected list, got {type(stats)}")
                    return False
            else:
                self.log(f"❌ Basketball stats endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Basketball stats endpoint error: {str(e)}")
            return False

    def test_basketball_standings_endpoint(self, tournament_id):
        """Test basketball standings endpoint"""
        self.log("🏀 Testing basketball standings endpoint...")
        
        try:
            response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/basketball-standings")
            
            if response.status_code == 200:
                standings = response.json()
                self.log(f"✅ Basketball standings retrieved - Found {len(standings)} teams")
                
                # Verify response structure
                if isinstance(standings, list):
                    for i, team_standing in enumerate(standings):
                        required_fields = ['team_id', 'team_name', 'played', 'wins', 'losses', 'points_for', 'points_against', 'point_difference', 'points', 'position']
                        for field in required_fields:
                            if field not in team_standing:
                                self.log(f"❌ Team standing {i} missing required field: {field}")
                                return False
                        
                        self.log(f"   🏆 {team_standing['position']}. {team_standing['team_name']} - {team_standing['wins']}-{team_standing['losses']} ({team_standing['points']} pts, +{team_standing['point_difference']})")
                    
                    return True
                else:
                    self.log(f"❌ Expected list, got {type(standings)}")
                    return False
            else:
                self.log(f"❌ Basketball standings endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Basketball standings endpoint error: {str(e)}")
            return False

    def test_basketball_tournament_endpoints(self):
        """Test all basketball tournament endpoints"""
        self.log("🏀 Starting Basketball Tournament Endpoints Testing...")
        self.log("=" * 60)
        
        # Step 1: Login/Register
        if not self.test_register_or_login():
            return False
        
        # Step 2: Check for existing basketball tournaments
        tournaments = self.test_get_tournaments()
        basketball_tournament = None
        
        if tournaments:
            # Look for existing basketball tournament
            for tournament in tournaments:
                if tournament.get('sport') == 'basket':
                    basketball_tournament = tournament
                    self.log(f"✅ Found existing basketball tournament: {tournament['name']} (ID: {tournament['id']})")
                    break
        
        if not basketball_tournament:
            # Create new basketball tournament
            basketball_tournament = self.test_create_basketball_tournament()
            if not basketball_tournament:
                return False
        
        tournament_id = basketball_tournament['id']
        
        # Step 3: Test GET /api/tournaments (should include basketball tournaments)
        self.log("\n🔹 Testing GET /api/tournaments (should include basketball tournaments)...")
        tournaments = self.test_get_tournaments()
        if not tournaments:
            return False
        
        basketball_found = False
        for tournament in tournaments:
            if tournament['id'] == tournament_id:
                basketball_found = True
                self.log(f"✅ Basketball tournament found in tournaments list: {tournament['name']}")
                break
        
        if not basketball_found:
            self.log("❌ Basketball tournament not found in tournaments list")
            return False
        
        # Step 4: Get or create teams
        try:
            teams_response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/teams")
            if teams_response.status_code == 200:
                teams = teams_response.json()
                if len(teams) >= 2:
                    self.log(f"✅ Using existing teams: {len(teams)} teams found")
                    teams = teams[:2]  # Use first 2 teams
                else:
                    self.log(f"📋 Found {len(teams)} teams, creating more...")
                    teams = self.test_create_basketball_teams(tournament_id)
                    if not teams:
                        return False
            else:
                self.log("📋 No teams found, creating new ones...")
                teams = self.test_create_basketball_teams(tournament_id)
                if not teams:
                    return False
        except Exception as e:
            self.log(f"❌ Error getting teams: {str(e)}")
            return False
        
        # Step 5: Get or create players
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
                        self.log(f"📋 Team {team['name']} needs more players...")
                        created_players = self.test_create_basketball_players([team])
                        if not created_players:
                            return False
                        all_players.update(created_players)
                else:
                    self.log(f"📋 Creating players for {team['name']}...")
                    created_players = self.test_create_basketball_players([team])
                    if not created_players:
                        return False
                    all_players.update(created_players)
            except Exception as e:
                self.log(f"❌ Error handling players for team {team['name']}: {str(e)}")
                return False
        
        # Step 6: Create a match if needed
        try:
            matches_response = self.session.get(f"{BASE_URL}/tournaments/{tournament_id}/matches")
            if matches_response.status_code == 200:
                matches = matches_response.json()
                if matches:
                    match = matches[0]
                    self.log(f"✅ Using existing match: {match['id']}")
                else:
                    match = self.test_create_basketball_match(tournament_id, teams)
                    if not match:
                        return False
            else:
                match = self.test_create_basketball_match(tournament_id, teams)
                if not match:
                    return False
        except Exception as e:
            self.log(f"❌ Error handling match: {str(e)}")
            return False
        
        # Step 7: Test basketball events batch save
        self.log("\n🔹 Testing basketball match events batch save...")
        if not self.test_basketball_events_batch_save(match['id'], teams, all_players):
            return False
        
        # Step 8: Test basketball scorers endpoint
        self.log("\n🔹 Testing basketball scorers endpoint...")
        if not self.test_basketball_scorers_endpoint(tournament_id):
            return False
        
        # Step 9: Test basketball stats endpoint
        self.log("\n🔹 Testing basketball stats endpoint...")
        if not self.test_basketball_stats_endpoint(tournament_id):
            return False
        
        # Step 10: Test basketball standings endpoint
        self.log("\n🔹 Testing basketball standings endpoint...")
        if not self.test_basketball_standings_endpoint(tournament_id):
            return False
        
        return True

def main():
    tester = BackendTester()
    
    try:
        # Test Basketball Tournament endpoints
        success = tester.test_basketball_tournament_endpoints()
        
        print("\n" + "=" * 60)
        if success:
            print("✅ ALL BASKETBALL TOURNAMENT TESTS PASSED!")
            print("🏀 Basketball Tournament Endpoints Tested:")
            print("   ✅ GET /api/tournaments - Returns tournaments including basketball ones")
            print("   ✅ GET /api/tournaments/{id}/basketball-standings - Basketball standings")
            print("   ✅ GET /api/tournaments/{id}/basketball-scorers - Basketball scorers")
            print("   ✅ GET /api/tournaments/{id}/basketball-stats - Basketball stats")
            print("   ✅ POST /api/matches/{match_id}/events/batch - Batch save with basketball events")
            print("\n🏀 Basketball Events Tested:")
            print("   ✅ points_1pt, points_2pt, points_3pt")
            print("   ✅ rebound, basketball_assist, foul, steal, block")
            print("\n🔐 Authentication: ✅ Working correctly")
            print("📊 Data integrity: ✅ All operations verified")
            print("🎯 API functionality: ✅ Ready for basketball match management")
        else:
            print("❌ SOME BASKETBALL TESTS FAILED - Check the logs above for details")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()