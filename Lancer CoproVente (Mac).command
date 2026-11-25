#!/bin/sh
# Lance CoproVente sur Mac : double-clic (ou dans le Terminal : sh "Lancer CoproVente (Mac).command")
cd "$(dirname "$0")"
echo ""
echo "  CoproVente est lancée : http://localhost:8080"
echo "  Laissez cette fenêtre ouverte pendant l'utilisation. Fermez-la pour arrêter."
echo ""
(sleep 1; open "http://localhost:8080/") &
python3 -m http.server 8080 --bind 127.0.0.1 || { open "http://localhost:8080/"; }
