"""Pydantic v2 request/response models (field names match the API spec)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class HeldSkill(BaseModel):
    skillId: str
    rank: int = Field(ge=0, le=3)


class RequirementIn(BaseModel):
    anyOf: list[str] = Field(min_length=1)
    minRank: int = Field(ge=1, le=3)
    label: Optional[str] = ""


class ComputeRequest(BaseModel):
    heldSkills: list[HeldSkill] = Field(default_factory=list)
    requirements: list[RequirementIn] = Field(default_factory=list)
    k: int = Field(default=3, ge=1, le=5)
    alpha: float = Field(default=0.7, ge=0)
    beta: float = Field(default=0.3, ge=0)
    useHeuristic: bool = True
    costBoundRatio: Optional[float] = Field(default=None, ge=1.0)
    heuristic: Optional[Literal["closure", "simple"]] = None


class Step(BaseModel):
    skillId: str
    order: int
    fromRank: int
    toRank: int
    estCost: float
    rationale: str


class PathOut(BaseModel):
    rank: int
    type: Literal["primary", "alternative"]
    totalLearningCost: float
    marketDemandAvg: float
    compositeScore: float
    steps: list[Step]


class Stats(BaseModel):
    statesExpanded: int
    statesToPrimary: Optional[int] = None
    elapsedMs: float
    capped: bool


class ComputeResponse(BaseModel):
    algorithm: Literal["a_star", "dijkstra", "greedy_fallback"]
    stats: Stats
    paths: list[PathOut]


class ValidateOrderRequest(BaseModel):
    steps: list[str]
    heldSkills: list[HeldSkill] = Field(default_factory=list)


class ValidateOrderResponse(BaseModel):
    violations: int
    details: list[dict]


class Health(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str
    graphLoaded: bool
    nodes: int
    edges: int
