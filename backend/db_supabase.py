"""
Thin Mongo-collection-like compatibility layer backed by Supabase (Postgres/PostgREST).

Rival Hub's backend was originally written against Motor (async MongoDB driver) using
a small, consistent subset of its API: find_one, find().sort().to_list(), insert_one,
update_one/update_many ($set / $inc, upsert), delete_one/delete_many, count_documents,
distinct. This module implements exactly that subset on top of supabase-py's
AsyncClient, so the ~200 call sites in server.py did not need to be rewritten
individually. It is intentionally narrow: only the operators actually used by
server.py ($set, $inc, $in, $ne, $lte, $gte, $gt, $lt, $eq, $regex/$options) are
supported.
"""
from __future__ import annotations

from datetime import datetime, date
from typing import Any, Optional

from postgrest.types import CountMethod
from supabase import AsyncClient


def _serialize(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    return value


def _serialize_doc(doc: dict) -> dict:
    return {k: _serialize(v) for k, v in doc.items()}


class _Result:
    """Mimics the small slice of pymongo's UpdateResult/DeleteResult used in server.py."""

    def __init__(self, count: int):
        self.matched_count = count
        self.modified_count = count
        self.deleted_count = count


class _Cursor:
    def __init__(self, table: "_Table", filter_dict: dict):
        self._table = table
        self._filter = filter_dict
        self._sort: list[tuple[str, int]] = []
        self._limit_n: Optional[int] = None

    def sort(self, field, direction: int = 1):
        if isinstance(field, list):
            self._sort = list(field)
        else:
            self._sort = [(field, direction)]
        return self

    def limit(self, n: int):
        self._limit_n = n
        return self

    async def to_list(self, length: Optional[int] = None):
        q = self._table._client.table(self._table._name).select("*")
        q = self._table._apply_filter(q, self._filter)
        for field, direction in self._sort:
            q = q.order(self._table._to_column(field), desc=(direction == -1))
        n = length or self._limit_n
        if n:
            q = q.limit(n)
        res = await q.execute()
        return [self._table._from_columns(row) for row in (res.data or [])]


class _Table:
    def __init__(self, client: AsyncClient, name: str, field_aliases: Optional[dict] = None):
        self._client = client
        self._name = name
        # python_field_name -> db_column_name (only needed where they differ, e.g. camelCase fields)
        self._aliases = field_aliases or {}
        self._reverse_aliases = {v: k for k, v in self._aliases.items()}

    def _to_column(self, field: str) -> str:
        return self._aliases.get(field, field)

    def _to_columns(self, doc: dict) -> dict:
        return {self._to_column(k): v for k, v in doc.items()}

    def _from_columns(self, doc: Optional[dict]) -> Optional[dict]:
        if doc is None:
            return None
        return {self._reverse_aliases.get(k, k): v for k, v in doc.items()}

    def _apply_filter(self, q, filter_dict: Optional[dict]):
        for key, val in (filter_dict or {}).items():
            col = self._to_column(key)
            if isinstance(val, dict):
                for op, opval in val.items():
                    if op == "$in":
                        q = q.in_(col, list(opval))
                    elif op == "$ne":
                        q = q.neq(col, _serialize(opval))
                    elif op == "$lte":
                        q = q.lte(col, _serialize(opval))
                    elif op == "$gte":
                        q = q.gte(col, _serialize(opval))
                    elif op == "$gt":
                        q = q.gt(col, _serialize(opval))
                    elif op == "$lt":
                        q = q.lt(col, _serialize(opval))
                    elif op == "$eq":
                        q = q.eq(col, _serialize(opval))
                    elif op == "$regex":
                        q = q.ilike(col, f"%{opval}%")
                    elif op == "$options":
                        continue  # handled together with $regex
                    else:
                        raise NotImplementedError(f"Unsupported operator {op!r} on {key!r}")
            else:
                q = q.eq(col, _serialize(val))
        return q

    async def find_one(self, filter_dict: Optional[dict] = None, projection=None) -> Optional[dict]:
        q = self._client.table(self._name).select("*")
        q = self._apply_filter(q, filter_dict)
        res = await q.limit(1).execute()
        data = res.data or []
        return self._from_columns(data[0]) if data else None

    def find(self, filter_dict: Optional[dict] = None, projection=None) -> _Cursor:
        return _Cursor(self, filter_dict or {})

    async def insert_one(self, doc: dict):
        payload = self._to_columns(_serialize_doc(doc))
        await self._client.table(self._name).insert(payload).execute()
        return _Result(1)

    async def update_one(self, filter_dict: dict, update: dict, upsert: bool = False):
        if "$inc" in update:
            raise NotImplementedError("$inc must be handled by the caller (read-modify-write)")
        payload = self._to_columns(_serialize_doc(update.get("$set", update)))
        q = self._client.table(self._name).update(payload)
        q = self._apply_filter(q, filter_dict)
        res = await q.execute()
        matched = len(res.data or [])
        if upsert and matched == 0:
            insert_doc = {k: v for k, v in filter_dict.items() if not isinstance(v, dict)}
            insert_doc.update(update.get("$set", update))
            await self.insert_one(insert_doc)
            return _Result(1)
        return _Result(matched)

    async def update_many(self, filter_dict: dict, update: dict):
        payload = self._to_columns(_serialize_doc(update.get("$set", update)))
        q = self._client.table(self._name).update(payload)
        q = self._apply_filter(q, filter_dict)
        res = await q.execute()
        return _Result(len(res.data or []))

    async def delete_one(self, filter_dict: dict):
        q = self._client.table(self._name).delete()
        q = self._apply_filter(q, filter_dict)
        res = await q.execute()
        return _Result(len(res.data or []))

    async def delete_many(self, filter_dict: dict):
        q = self._client.table(self._name).delete()
        q = self._apply_filter(q, filter_dict)
        res = await q.execute()
        return _Result(len(res.data or []))

    async def count_documents(self, filter_dict: Optional[dict] = None) -> int:
        q = self._client.table(self._name).select("*", count=CountMethod.exact, head=True)
        q = self._apply_filter(q, filter_dict)
        res = await q.execute()
        return res.count or 0

    async def distinct(self, field: str, filter_dict: Optional[dict] = None) -> list:
        col = self._to_column(field)
        q = self._client.table(self._name).select(col)
        q = self._apply_filter(q, filter_dict)
        res = await q.execute()
        seen = []
        seen_set = set()
        for row in (res.data or []):
            v = row.get(col)
            if v not in seen_set:
                seen_set.add(v)
                seen.append(v)
        return seen


# Per-table field aliases: python/JSON field name -> actual Postgres column name.
# Only "matches.currentGame" differs (kept camelCase in the API/Pydantic models to
# match the existing frontend contract) from its snake_case DB column.
_FIELD_ALIASES = {
    "matches": {"currentGame": "current_game"},
}


class SupabaseDB:
    """Drop-in replacement for a Motor database handle, exposing `db.<collection>`."""

    def __init__(self, client: AsyncClient):
        self._client = client
        self._tables: dict[str, _Table] = {}

    def __getattr__(self, name: str) -> _Table:
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._tables:
            self._tables[name] = _Table(self._client, name, _FIELD_ALIASES.get(name))
        return self._tables[name]
