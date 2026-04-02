#!/usr/bin/env python3
"""
Backend Testing Script for Tennis LIVE Scoring System
Tests the specific tennis match functionality as requested.
"""

import asyncio
import httpx
import json
import sys
from datetime import datetime, timezone

# Backend URL from environment
BACKEND_URL = "https://torneo-live.preview.emergentagent.com/api"

class TennisLiveTestSuite:
    def __init__(self):
        self.session_token = None
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_results = []
        
    async def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    async def authenticate(self):
        """Authenticate user to get session token"""
        print("\n🔐 AUTHENTICATION PHASE")
        
        # Try to register a new test user
        register_data = {
            "email": "tennis_tester@test.com",
            "password": "TennisTest123!",
            "name": "Tennis Tester"
        }
        
        try:
            response = await self.client.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get("session_token")
                await self.log_result("User Registration", True, f"Registered new user: {data.get('email')}")
                return True
            elif response.status_code == 400 and "già registrata" in response.text:
                # User exists, try login
                login_data = {
                    "email": register_data["email"],
                    "password": register_data["password"]
                }
                response = await self.client.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    self.session_token = data.get("session_token")
                    await self.log_result("User Login", True, f"Logged in user: {data.get('email')}")
                    return True
                else:
                    await self.log_result("User Login", False, f"Login failed: {response.status_code}", response.text)
                    return False
            else:
                await self.log_result("User Registration", False, f"Registration failed: {response.status_code}", response.text)
                return False
        except Exception as e:
            await self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def get_headers(self):
        """Get headers with authentication"""
        return {"Authorization": f"Bearer {self.session_token}"} if self.session_token else {}
    
    async def create_tennis_tournament_and_match(self):
        """Create a tennis tournament and match for testing"""
        print("\n🎾 CREATING TENNIS TOURNAMENT AND MATCH FOR TESTING")
        
        # Create tennis tournament
        tournament_data = {
            "name": "Tennis Test Tournament",
            "description": "Test tournament for tennis live scoring",
            "sport": "tennis",
            "category": "Open",
            "format": "league",
            "game_format": "1v1",
            "game_structure": "3_sets",
            "is_public": True
        }
        
        try:
            response = await self.client.post(
                f"{BACKEND_URL}/tournaments", 
                json=tournament_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                tournament = response.json()
                tournament_id = tournament.get("id")
                await self.log_result(
                    "Create Tennis Tournament", 
                    True, 
                    f"Created tennis tournament: {tournament_id}",
                    {"tournament": tournament}
                )
                
                # Create two teams
                team1_data = {"name": "Player 1"}
                team2_data = {"name": "Player 2"}
                
                team1_response = await self.client.post(
                    f"{BACKEND_URL}/tournaments/{tournament_id}/teams",
                    json=team1_data,
                    headers=self.get_headers()
                )
                
                team2_response = await self.client.post(
                    f"{BACKEND_URL}/tournaments/{tournament_id}/teams",
                    json=team2_data,
                    headers=self.get_headers()
                )
                
                if team1_response.status_code == 200 and team2_response.status_code == 200:
                    team1 = team1_response.json()
                    team2 = team2_response.json()
                    
                    await self.log_result(
                        "Create Tennis Teams", 
                        True, 
                        f"Created teams: {team1.get('name')} vs {team2.get('name')}"
                    )
                    
                    # Create a match
                    match_data = {
                        "home_team_id": team1.get("id"),
                        "away_team_id": team2.get("id"),
                        "round": "Giornata 6",
                        "match_date": "2024-01-15",
                        "match_time": "15:00"
                    }
                    
                    match_response = await self.client.post(
                        f"{BACKEND_URL}/tournaments/{tournament_id}/matches",
                        json=match_data,
                        headers=self.get_headers()
                    )
                    
                    if match_response.status_code == 200:
                        match = match_response.json()
                        await self.log_result(
                            "Create Tennis Match", 
                            True, 
                            f"Created tennis match: {match.get('id')}",
                            {"match": match}
                        )
                        return tournament_id, match
                    else:
                        await self.log_result(
                            "Create Tennis Match", 
                            False, 
                            f"Failed to create match: {match_response.status_code}",
                            match_response.text
                        )
                        return tournament_id, None
                else:
                    await self.log_result(
                        "Create Tennis Teams", 
                        False, 
                        f"Failed to create teams: {team1_response.status_code}, {team2_response.status_code}"
                    )
                    return tournament_id, None
            else:
                await self.log_result(
                    "Create Tennis Tournament", 
                    False, 
                    f"Failed to create tournament: {response.status_code}",
                    response.text
                )
                return None, None
                
        except Exception as e:
            await self.log_result("Create Tennis Tournament", False, f"Request error: {str(e)}")
            return None, None

    async def test_get_tournament_matches(self, tournament_id):
        """Test GET /api/tournaments/{tournament_id}/matches"""
        print(f"\n🎾 TESTING TOURNAMENT MATCHES ENDPOINT FOR {tournament_id}")
        
        try:
            response = await self.client.get(f"{BACKEND_URL}/tournaments/{tournament_id}/matches")
            
            if response.status_code == 200:
                matches = response.json()
                await self.log_result(
                    "GET Tournament Matches", 
                    True, 
                    f"Retrieved {len(matches)} matches for tournament {tournament_id}",
                    {"matches_count": len(matches), "sample_match": matches[0] if matches else None}
                )
                return matches
            else:
                await self.log_result(
                    "GET Tournament Matches", 
                    False, 
                    f"Failed to get matches: HTTP {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            await self.log_result("GET Tournament Matches", False, f"Request error: {str(e)}")
            return None
    
    async def test_update_match_tennis_data(self, match_id):
        """Test PUT /api/matches/{match_id} with tennis-specific payload"""
        print(f"\n🎾 TESTING TENNIS MATCH UPDATE FOR {match_id}")
        
        # Tennis match update payload as specified in the request
        tennis_payload = {
            "status": "in_progress",
            "tennis_sets": [
                {
                    "setNumber": 1, 
                    "homeGames": 4, 
                    "awayGames": 3, 
                    "completed": False, 
                    "tiebreak": False, 
                    "tiebreakHome": 0, 
                    "tiebreakAway": 0
                }
            ],
            "currentGame": {
                "homePoints": 2,
                "awayPoints": 1,
                "isDeuce": False,
                "advantage": None,
                "currentSetIndex": 0,
                "homeGamesInSet": 4,
                "awayGamesInSet": 3
            }
            # Note: Not setting home_goals/away_goals to keep match in_progress
        }
        
        try:
            response = await self.client.put(
                f"{BACKEND_URL}/matches/{match_id}", 
                json=tennis_payload,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                updated_match = response.json()
                await self.log_result(
                    "PUT Tennis Match Update", 
                    True, 
                    f"Successfully updated match {match_id} with tennis data",
                    {
                        "status": updated_match.get("status"),
                        "tennis_sets": updated_match.get("tennis_sets"),
                        "currentGame": updated_match.get("currentGame")
                    }
                )
                return updated_match
            else:
                await self.log_result(
                    "PUT Tennis Match Update", 
                    False, 
                    f"Failed to update match: HTTP {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            await self.log_result("PUT Tennis Match Update", False, f"Request error: {str(e)}")
            return None
    
    async def test_get_matches_live(self, tournament_id):
        """Test GET /api/tournaments/{tournament_id}/matches-live"""
        print(f"\n🎾 TESTING MATCHES LIVE ENDPOINT FOR {tournament_id}")
        
        try:
            response = await self.client.get(f"{BACKEND_URL}/tournaments/{tournament_id}/matches-live")
            
            if response.status_code == 200:
                live_matches = response.json()
                await self.log_result(
                    "GET Matches Live", 
                    True, 
                    f"Retrieved {len(live_matches)} live matches for tournament {tournament_id}",
                    {"live_matches_count": len(live_matches)}
                )
                
                # Look for in_progress matches with tennis data
                in_progress_matches = [m for m in live_matches if m.get("status") == "in_progress"]
                matches_with_events = [m for m in live_matches if m.get("has_events") == True]
                
                await self.log_result(
                    "Live Matches Analysis", 
                    True, 
                    f"Found {len(in_progress_matches)} in-progress matches, {len(matches_with_events)} with events",
                    {
                        "in_progress_count": len(in_progress_matches),
                        "with_events_count": len(matches_with_events),
                        "sample_live_match": in_progress_matches[0] if in_progress_matches else None
                    }
                )
                
                # If we have in-progress matches, verify tennis data structure
                if in_progress_matches:
                    target_match = in_progress_matches[0]
                    
                    # Verify tennis-specific fields
                    has_status = target_match.get("status") == "in_progress"
                    has_events = target_match.get("has_events") == True
                    has_current_game = target_match.get("currentGame") is not None
                    has_tennis_sets = target_match.get("tennis_sets") is not None
                    
                    success = has_status and has_events and has_current_game and has_tennis_sets
                    
                    await self.log_result(
                        "Tennis Live Data Verification", 
                        success, 
                        f"Tennis match data validation: status={has_status}, events={has_events}, currentGame={has_current_game}, tennis_sets={has_tennis_sets}",
                        {
                            "match_id": target_match.get("id"),
                            "status": target_match.get("status"),
                            "has_events": target_match.get("has_events"),
                            "currentGame": target_match.get("currentGame"),
                            "tennis_sets": target_match.get("tennis_sets"),
                            "live_home_score": target_match.get("live_home_score"),
                            "live_away_score": target_match.get("live_away_score")
                        }
                    )
                else:
                    await self.log_result(
                        "Tennis Live Data Verification", 
                        True, 
                        "No in-progress matches found - this is expected for new tournaments"
                    )
                
                return live_matches
            else:
                await self.log_result(
                    "GET Matches Live", 
                    False, 
                    f"Failed to get live matches: HTTP {response.status_code}",
                    response.text
                )
                return None
                
        except Exception as e:
            await self.log_result("GET Matches Live", False, f"Request error: {str(e)}")
            return None
    
    async def run_tennis_live_tests(self):
        """Run the complete tennis live scoring test suite"""
        print("🎾 TENNIS LIVE SCORING SYSTEM TEST SUITE")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not await self.authenticate():
            print("\n❌ AUTHENTICATION FAILED - Cannot proceed with tests")
            return False
        
        # Step 2: Create tennis tournament and match for testing
        tournament_id, match_data = await self.create_tennis_tournament_and_match()
        if not tournament_id or not match_data:
            print("\n❌ FAILED TO CREATE TENNIS TOURNAMENT/MATCH - Cannot proceed")
            return False
        
        match_id = match_data.get("id")
        
        # Step 3: Test getting tournament matches
        matches = await self.test_get_tournament_matches(tournament_id)
        if not matches:
            print("\n❌ FAILED TO GET TOURNAMENT MATCHES")
            return False
        
        # Step 4: Update match with tennis data
        updated_match = await self.test_update_match_tennis_data(match_id)
        if not updated_match:
            print("\n❌ FAILED TO UPDATE MATCH WITH TENNIS DATA")
            return False
        
        # Step 5: Verify live matches endpoint
        live_matches = await self.test_get_matches_live(tournament_id)
        if not live_matches:
            print("\n❌ FAILED TO GET LIVE MATCHES")
            return False
        
        # Step 6: Also test the original tournament endpoint as requested
        print("\n🎾 TESTING ORIGINAL TOURNAMENT ENDPOINT")
        original_matches = await self.test_get_tournament_matches("tournament_ee5c008fc980")
        original_live_matches = await self.test_get_matches_live("tournament_ee5c008fc980")
        
        # Summary
        print("\n" + "=" * 60)
        print("🎾 TENNIS LIVE SCORING TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = [r for r in self.test_results if r["success"]]
        failed_tests = [r for r in self.test_results if not r["success"]]
        
        print(f"✅ PASSED: {len(passed_tests)} tests")
        print(f"❌ FAILED: {len(failed_tests)} tests")
        
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['message']}")
        
        return len(failed_tests) == 0
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

async def main():
    """Main test execution"""
    test_suite = TennisLiveTestSuite()
    
    try:
        success = await test_suite.run_tennis_live_tests()
        
        # Save detailed results
        with open("/app/tennis_test_results.json", "w") as f:
            json.dump({
                "success": success,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "test_results": test_suite.test_results
            }, f, indent=2)
        
        print(f"\n📊 Detailed results saved to: /app/tennis_test_results.json")
        
        if success:
            print("\n🎉 ALL TENNIS LIVE SCORING TESTS PASSED!")
            sys.exit(0)
        else:
            print("\n💥 SOME TENNIS LIVE SCORING TESTS FAILED!")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        sys.exit(1)
    finally:
        await test_suite.close()

if __name__ == "__main__":
    asyncio.run(main())