#!/usr/bin/env python3
"""
Specific test for match_07696a8f3684 as requested in the review
"""

import asyncio
import httpx
import json
from datetime import datetime, timezone

BACKEND_URL = "https://torneo-live.preview.emergentagent.com/api"

async def test_specific_match():
    """Test the specific match requested"""
    client = httpx.AsyncClient(timeout=30.0)
    
    try:
        # Test 1: GET tournament matches
        print("🎾 Testing GET /api/tournaments/tournament_ee5c008fc980/matches")
        response = await client.get(f"{BACKEND_URL}/tournaments/tournament_ee5c008fc980/matches")
        
        if response.status_code == 200:
            matches = response.json()
            print(f"✅ Retrieved {len(matches)} matches")
            
            # Find match_07696a8f3684
            target_match = None
            for match in matches:
                if match.get("id") == "match_07696a8f3684":
                    target_match = match
                    break
            
            if target_match:
                print(f"✅ Found target match: {target_match.get('id')} in {target_match.get('round')}")
                print(f"   Current status: {target_match.get('status')}")
                print(f"   Home team: {target_match.get('home_team_id')}")
                print(f"   Away team: {target_match.get('away_team_id')}")
            else:
                print("❌ Target match match_07696a8f3684 not found")
                print("Available matches:")
                for match in matches:
                    print(f"   - {match.get('id')} ({match.get('round')})")
        else:
            print(f"❌ Failed to get matches: {response.status_code}")
            print(response.text)
        
        # Test 2: GET matches-live
        print("\n🎾 Testing GET /api/tournaments/tournament_ee5c008fc980/matches-live")
        response = await client.get(f"{BACKEND_URL}/tournaments/tournament_ee5c008fc980/matches-live")
        
        if response.status_code == 200:
            live_matches = response.json()
            print(f"✅ Retrieved {len(live_matches)} live matches")
            
            # Find match_07696a8f3684 in live data
            target_live_match = None
            for match in live_matches:
                if match.get("id") == "match_07696a8f3684":
                    target_live_match = match
                    break
            
            if target_live_match:
                print(f"✅ Found target match in live data:")
                print(f"   Status: {target_live_match.get('status')}")
                print(f"   Has events: {target_live_match.get('has_events')}")
                print(f"   Live home score: {target_live_match.get('live_home_score')}")
                print(f"   Live away score: {target_live_match.get('live_away_score')}")
                print(f"   Tennis sets: {target_live_match.get('tennis_sets')}")
                print(f"   Current game: {target_live_match.get('currentGame')}")
            else:
                print("❌ Target match not found in live data")
            
            # Show summary of all matches
            in_progress = [m for m in live_matches if m.get("status") == "in_progress"]
            with_events = [m for m in live_matches if m.get("has_events") == True]
            
            print(f"\n📊 Live matches summary:")
            print(f"   Total matches: {len(live_matches)}")
            print(f"   In progress: {len(in_progress)}")
            print(f"   With events: {len(with_events)}")
            
            if in_progress:
                print("   In-progress matches:")
                for match in in_progress:
                    print(f"     - {match.get('id')} ({match.get('round')})")
        else:
            print(f"❌ Failed to get live matches: {response.status_code}")
            print(response.text)
        
        # Test 3: Try to update the specific match (this will likely fail due to permissions)
        print("\n🎾 Testing PUT /api/matches/match_07696a8f3684 (expected to fail - no auth)")
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
        }
        
        response = await client.put(f"{BACKEND_URL}/matches/match_07696a8f3684", json=tennis_payload)
        
        if response.status_code == 200:
            print("✅ Successfully updated match (unexpected!)")
            updated_match = response.json()
            print(f"   New status: {updated_match.get('status')}")
        elif response.status_code == 401:
            print("✅ Expected 401 Unauthorized - authentication required")
        elif response.status_code == 403:
            print("✅ Expected 403 Forbidden - user not authorized to modify this match")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(response.text)
        
        print("\n🎾 SPECIFIC MATCH TEST COMPLETED")
        
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
    finally:
        await client.aclose()

if __name__ == "__main__":
    asyncio.run(test_specific_match())