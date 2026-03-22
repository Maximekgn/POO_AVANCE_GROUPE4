from __future__ import annotations

from threading import Lock


_presence_lock = Lock()
_connections_count: dict[int, int] = {}


def mark_online(user_id: int) -> bool:
    """Returns True only when user becomes online for the first active socket."""
    with _presence_lock:
        count = _connections_count.get(user_id, 0) + 1
        _connections_count[user_id] = count
        return count == 1


def mark_offline(user_id: int) -> bool:
    """Returns True only when user becomes fully offline."""
    with _presence_lock:
        count = _connections_count.get(user_id, 0)
        if count <= 1:
            _connections_count.pop(user_id, None)
            return True

        _connections_count[user_id] = count - 1
        return False


def is_online(user_id: int) -> bool:
    return user_id in _connections_count


def get_online_user_ids() -> list[int]:
    with _presence_lock:
        return list(_connections_count.keys())
