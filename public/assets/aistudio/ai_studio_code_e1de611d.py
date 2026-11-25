from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

app = FastAPI(
    title="California Lottery Winning Numbers API",
    description="An API to retrieve the latest winning numbers for California Lottery games.",
    version="1.0.0"
)

# Define schemas for the API responses
class LottoResult(BaseModel):
    game_name: str = Field(..., example="SuperLotto Plus")
    draw_date: date = Field(..., example="2026-09-19")
    winning_numbers: List[int] = Field(..., example=[4, 12, 25, 31, 42])
    mega_number: Optional[int] = Field(None, example=7)
    jackpot: Optional[str] = Field(None, example="$12 Million")

# Mock database simulating the latest draw results
# In a production environment, you would fetch and cache this data from a database or a scraper.
LOTTERY_DATA = {
    "superlotto-plus": LottoResult(
        game_name="SuperLotto Plus",
        draw_date=date(2026, 9, 19),
        winning_numbers=[8, 15, 22, 37, 44],
        mega_number=18,
        jackpot="$23 Million"
    ),
    "fantasy-5": LottoResult(
        game_name="Fantasy 5",
        draw_date=date(2026, 9, 20),
        winning_numbers=[3, 11, 18, 29, 32],
        mega_number=None,
        jackpot="$180,000"
    ),
    "daily-3": LottoResult(
        game_name="Daily 3",
        draw_date=date(2026, 9, 21),
        winning_numbers=[7, 2, 9],
        mega_number=None,
        jackpot=None
    ),
    "daily-4": LottoResult(
        game_name="Daily 4",
        draw_date=date(2026, 9, 21),
        winning_numbers=[4, 0, 8, 3],
        mega_number=None,
        jackpot=None
    )
}

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the California Lottery Winning Numbers API",
        "endpoints": {
            "all_results": "/api/v1/results",
            "specific_game": "/api/v1/results/{game_id}"
        }
    }

@app.get("/api/v1/results", response_model=List[LottoResult])
def get_all_results():
    """Retrieve the latest results for all supported California Lottery games."""
    return list(LOTTERY_DATA.values())

@app.get("/api/v1/results/{game_id}", response_model=LottoResult)
def get_game_result(game_id: str):
    """
    Retrieve the latest winning numbers for a specific game.
    Available game IDs: superlotto-plus, fantasy-5, daily-3, daily-4
    """
    game_id_lower = game_id.lower()
    if game_id_lower not in LOTTERY_DATA:
        raise HTTPException(
            status_code=404, 
            detail=f"Game '{game_id}' not found. Choose from: {', '.join(LOTTERY_DATA.keys())}"
        )
    return LOTTERY_DATA[game_id_lower]