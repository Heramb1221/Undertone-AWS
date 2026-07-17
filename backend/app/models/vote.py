"""
Nod/Pass voting (Glossary.md — renamed upvote/downvote). One vote per user per
post/comment, stored as its own item so a repeat click toggles it off and a
different click switches it. Post/comment counters are updated atomically via
DynamoDB's ADD expression, so concurrent votes from different users never clobber
each other's counts. Resonance (docs/Glossary.md) is the post/comment author's
running net-Nod total, updated in the same step.

Known limitation: reading a single user's own existing vote before writing their
new one is two separate calls, not one transaction. Two rapid double-clicks from
the *same* user could theoretically race. Acceptable at this scale — flagged
here rather than silently ignored, and revisited if abuse patterns show up.
"""

from app.db import get_table


class SelfVoteError(Exception):
    pass


class InvalidVoteError(Exception):
    pass


def _get_existing_vote(vote_pk: str, user_id: str) -> str | None:
    table = get_table()
    item = table.get_item(Key={"PK": vote_pk, "SK": f"VOTE#{user_id}"}).get("Item")
    return item["vote"] if item else None


def _write_vote(vote_pk: str, user_id: str, new_vote: str | None) -> None:
    table = get_table()
    if new_vote is None:
        table.delete_item(Key={"PK": vote_pk, "SK": f"VOTE#{user_id}"})
    else:
        table.put_item(Item={"PK": vote_pk, "SK": f"VOTE#{user_id}", "vote": new_vote})


def _deltas(old_vote: str | None, new_vote: str | None) -> tuple[int, int]:
    nod_delta, pass_delta = 0, 0
    if old_vote == "nod":
        nod_delta -= 1
    elif old_vote == "pass":
        pass_delta -= 1
    if new_vote == "nod":
        nod_delta += 1
    elif new_vote == "pass":
        pass_delta += 1
    return nod_delta, pass_delta


def _update_counts(pk: str, sk: str, nod_delta: int, pass_delta: int) -> dict:
    table = get_table()
    response = table.update_item(
        Key={"PK": pk, "SK": sk},
        UpdateExpression="ADD nod_count :n, pass_count :p",
        ExpressionAttributeValues={":n": nod_delta, ":p": pass_delta},
        ReturnValues="ALL_NEW",
    )
    return response["Attributes"]


def _update_resonance(author_id: str, net_delta: int) -> None:
    if net_delta == 0:
        return
    table = get_table()
    table.update_item(
        Key={"PK": f"USER#{author_id}", "SK": "PROFILE"},
        UpdateExpression="ADD resonance_score :d",
        ExpressionAttributeValues={":d": net_delta},
    )


def _cast_vote(vote_pk: str, item_pk: str, item_sk: str, user_id: str, requested_vote: str, author_id: str) -> dict:
    if requested_vote not in ("nod", "pass"):
        raise InvalidVoteError("vote must be 'nod' or 'pass'")
    if user_id == author_id:
        raise SelfVoteError("You can't Nod or Pass your own content.")

    old_vote = _get_existing_vote(vote_pk, user_id)
    new_vote = None if old_vote == requested_vote else requested_vote

    _write_vote(vote_pk, user_id, new_vote)
    nod_delta, pass_delta = _deltas(old_vote, new_vote)
    updated = _update_counts(item_pk, item_sk, nod_delta, pass_delta)
    _update_resonance(author_id, nod_delta - pass_delta)

    return {"nod_count": updated["nod_count"], "pass_count": updated["pass_count"], "your_vote": new_vote}


def cast_post_vote(circle_id: str, post_id: str, user_id: str, requested_vote: str, author_id: str) -> dict:
    return _cast_vote(
        vote_pk=f"POST#{post_id}",
        item_pk=f"CIRCLE#{circle_id}",
        item_sk=f"POST#{post_id}",
        user_id=user_id,
        requested_vote=requested_vote,
        author_id=author_id,
    )


def cast_comment_vote(post_id: str, comment_id: str, user_id: str, requested_vote: str, author_id: str) -> dict:
    return _cast_vote(
        vote_pk=f"COMMENT#{comment_id}",
        item_pk=f"POST#{post_id}",
        item_sk=f"COMMENT#{comment_id}",
        user_id=user_id,
        requested_vote=requested_vote,
        author_id=author_id,
    )


def get_user_vote(vote_pk: str, user_id: str) -> str | None:
    return _get_existing_vote(vote_pk, user_id)
