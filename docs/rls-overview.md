**RLS Overview**
Gebruik [scripts/rls-final.sql](/Users/wouter/Desktop/uitgesproken/scripts/rls-final.sql) voortaan als de definitieve permissie- en helperlaag voor Supabase.

Wat de oude scripts nu zijn:
- `scripts/fase2-profiles.sql`: schema-opbouw voor `profiles` en `reserved_usernames`
- `scripts/fase3-spaces-rls.sql`: oude tussenstap voor `spaces`
- `scripts/fase7-sets-publicatie.sql`: schema-opbouw voor `sets.status` en `sets.visibility`
- `scripts/fase9b-admin-role.sql`: schema-opbouw voor `profiles.role` en `categories`
- `scripts/fase11-samenwerking.sql`: schema-opbouw voor `set_members`
- `scripts/fase13-rls-review.sql`: tussentijdse reparaties tijdens debugging

Aanbevolen werkwijze:
1. Gebruik de fasescripts alleen nog voor ontbrekend schema.
2. Gebruik daarna `scripts/rls-final.sql` om de actuele RLS/policies/helpers consistent te zetten.
3. Als je later rechten wijzigt, werk eerst `scripts/rls-final.sql` bij.

Kern van de huidige rechten:
- `profiles`: eigenaar leest/bewerkt eigen profiel; publieke maker-home en username lookup zijn toegestaan; admin read via helperfunctie.
- `spaces`: eigenaar beheert eigen space; publieke read alleen voor maker-home of publieke/unlisted setlinks.
- `sets`: eigenaar beheert; publieke read voor `live + public`; directe read voor `live + unlisted`; members mogen lezen en inhoud bewerken.
- `set_members`: owner beheert memberships; member ziet en verwijdert eigen membership; FREE-limiet wordt in de database afgedwongen.

Belangrijk technisch principe:
We gebruiken `SECURITY DEFINER` helperfuncties om recursieve RLS-lussen tussen `profiles`, `spaces`, `sets` en `set_members` te voorkomen.
