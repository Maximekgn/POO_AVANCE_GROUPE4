from __future__ import annotations


def build_conversation_id(user_id_1: int, user_id_2: int) -> str:
    """Build a stable conversation id for a pair of users."""
    first, second = sorted([int(user_id_1), int(user_id_2)])
    return f"{first}_{second}"


def conversation_includes_user(conversation_id: str, user_id: int) -> bool:
    """Return True when a conversation id belongs to the user pair including user_id."""
    parts = (conversation_id or "").split("_")
    if len(parts) != 2:
        return False

    try:
        return int(user_id) in {int(parts[0]), int(parts[1])}
    except ValueError:
        return False
