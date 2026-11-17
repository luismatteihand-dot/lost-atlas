#!/usr/bin/env python3
"""Génère data/places.json à partir des légendes du guide papier.
Pour ajouter un territoire : ajouter une entrée LEGENDS + éventuellement des positions dans POS,
puis relancer :  python3 tools/build_places.py
Fiabilité de position : "v" = vérifiée (OpenStreetMap, Wikipedia), "e" = estimée (calculée depuis la carte papier), "i" = indicative, absente = non positionné.
Les positions OpenStreetMap viennent de tools/osm_matches.json (rapprochement de noms relu à la main)."""
import json, math, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- Légendes (numérotation et catégories d'origine du guide) ----
# cat : inc=Incontournables, voir=Voir, act=Activités, loger=Se loger, manger=Se restaurer, verre=Prendre un verre, shop=Shopping
LEGENDS = {
 "t1": {"page": 75, "items": [
  ("inc", [(1,"Dar Si Said"),(2,"Musée du Patrimoine Immatériel"),(3,"Musée Tiskiwin")]),
  ("voir",[(4,"Palais de la Bahia"),(5,"Musée de l'Art culinaire marocain")]),
  ("act", [(6,"Moroccan Food Adventures")]),
  ("loger",[(7,"Hotel Sherazade"),(8,"Le Gallia"),(9,"Riad Le Clos des Arts"),(10,"Riad Linda"),(11,"Riad UP")]),
  ("manger",[(12,"Argana Café"),(13,"BlackChich"),(14,"Cantine des Gazelles"),(15,"Chez Lamine Hadj Mustapha"),(16,"DaDa Marrakech"),(17,"Stands culinaires de Jemaa el-Fna"),(18,"La Famille"),(19,"L'Adresse"),(20,"Mandala Society"),(21,"Marrakech Henna Art Café"),(22,"Allée des Méchouis"),(23,"Naranj"),(24,"Oriental Legend"),(25,"Pâtisserie des Princes"),(26,"Taj'in Darna"),(27,"Zeitoun Café")]),
  ("verre",[(28,"Café de France"),(29,"Grand Balcon du Café Glacier"),(30,"La Pergola"),(31,"Le Salama Skybar")]),
  ("shop",[(32,"Aromatimri"),(33,"Herboristerie Firdaous"),(34,"Jad Bain et Beauté"),(35,"Naturom"),(36,"Souk Ableuh"),(37,"Souk Semmarine")]),
 ]},
 "t2": {"page": 98, "items": [
  ("inc", [(1,"Dar Cherifa"),(2,"Hammam de la Rose"),(3,"Hammam Mouassine"),(4,"Le Bain Bleu"),(5,"Le Jardin Secret"),(6,"Musée de la Femme"),(7,"Musée de la Musique"),(8,"Musée des Confluences Dar el-Bacha"),(9,"Place Rahba Kedima"),(10,"Souk des teinturiers"),(11,"Zwaq Art")]),
  ("voir",[(12,"Fondouk El-Amri"),(13,"Fondouk El-Mizen")]),
  ("loger",[(14,"Equity Point Hostel"),(15,"Riad El Zohar"),(16,"Riad Le J"),(17,"Riad L'Orangeraie"),(18,"Riad Magellan")]),
  ("manger",[(19,"Ayaso"),(20,"Ksar Essaoussane"),(21,"Le Jardin"),(22,"Nomad"),(23,"Shtatto"),(24,"Soul Food"),(25,"Terrasse des Épices")]),
  ("verre",[(26,"1112 Marrakech"),(27,"Bacha Coffee"),(28,"Café Arabe"),(29,"Café Chez Maazouz"),(30,"Café des Épices"),(31,"Le Jardin Ben Youssef")]),
  ("shop",[(32,"Arganino"),(33,"Assouss Argane"),(34,"Bibi Art"),(35,"Centre de la Femme Artisane"),(36,"Different."),(37,"Funky Cool Medina"),(38,"Moroccan Botanist"),(39,"Sarah Maj"),(40,"Souk Cherifia"),(41,"Souk de tapis"),(42,"Souk Haddadine"),(43,"Stand de poterie de Tamegroute")]),
 ]},
 "t3": {"page": 96, "items": [
  ("inc", [(1,"Médersa Ben Youssef"),(2,"Dar Bellarj"),(3,"Koubba Ba'Adiyn"),(4,"Maison de la Photographie"),(5,"Musée de Marrakech"),(6,"World Storytelling Café")]),
  ("loger",[(7,"Le Farnatchi"),(8,"Riad Berbère"),(9,"Riad Ecila"),(10,"Riad Star")]),
  ("manger",[(11,"Le Trou Au Mur"),(12,"L'Mida"),(13,"Naima")]),
  ("shop",[(14,"By Faissal"),(15,"Fiber Trip"),(16,"La Qoubba Galerie d'Art")]),
 ]},
 "t4": {"page": 103, "items": [
  ("inc", [(1,"Palais El-Badi"),(2,"Palais de la Bahia"),(3,"Synagogue El-Azama"),(4,"Miaara (cimetière juif)"),(5,"Mosquée de la Casbah"),(6,"Monde des Arts de la Parure"),(7,"Place des Ferblantiers"),(8,"Tombeaux saadiens")]),
  ("act", [(9,"Café Clock"),(10,"Hammam Ziani"),(11,"La Sultana"),(12,"Les Jardins de la Medina (spa)"),(13,"Marrakech Green Wheels")]),
  ("loger",[(14,"Les Jardins de la Medina"),(15,"Riad Azoulay"),(16,"Riad La Badia"),(17,"Riad Noos Noos"),(18,"Zoraida Riad & Spa")]),
  ("manger",[(19,"Beldi Fusion Kitchen"),(20,"Chez Kamal & Brahim"),(21,"Kasbah Café"),(22,"La Table de la Kasbah"),(23,"La Table de la Sultana"),(24,"Mazel Streetfood Coffee")]),
  ("verre",[(25,"Kosybar")]),
 ]},
 "t5": {"page": 112, "items": [
  ("inc", [(1,"Bab Doukkala"),(2,"Fontaine Chrob ou Chouf"),(3,"Remparts"),(4,"Les Terrasses des Arts"),(5,"Musée du Parfum")]),
  ("act", [(6,"Dar Anis Yoga Studio"),(7,"Flow Yoga Studio"),(8,"Pikala Bikes")]),
  ("loger",[(9,"Dar Baraka & Karam"),(10,"Izza"),(11,"Riad Al Massarah"),(12,"Riad BE Marrakech"),(13,"Riad Jardin Secret"),(14,"Riad Tizwa"),(15,"The Central House")]),
  ("manger",[(16,"Henna Café"),(17,"La Maison Arabe"),(18,"Les Jardins du Lotus"),(19,"Naama"),(20,"Pikala Café"),(21,"Regue Jamaa"),(22,"Zaman Food")]),
  ("shop",[(23,"Akéwa Tribes Gallery"),(24,"Al Kawtar"),(25,"Mustapha Blaoui"),(26,"Soufiane Zarib"),(27,"V. Barkowski")]),
 ]},
 "t6": {"page": 121, "items": [
  ("inc", [(1,"Comptoir des Mines"),(2,"Jardin Majorelle"),(3,"Musée Yves Saint-Laurent")]),
  ("voir",[(4,"Art Space Aziz Lkhattaf"),(5,"Ciné Théâtre Palace"),(6,"MACMA"),(7,"Matisse Art Gallery"),(8,"Galeries du passage Ghandouri")]),
  ("act", [(9,"Palmetto Architecture & Coffee")]),
  ("loger",[(10,"Moro Boutique Hotel")]),
  ("manger",[(11,"+61"),(12,"Amal Center"),(13,"Blue Ribbon"),(14,"Café 16"),(15,"Farmers"),(16,"Le Colisée"),(17,"Mizaan"),(18,"Sahbi Sahbi")]),
  ("verre",[(19,"Barometre Marrakech"),(20,"Café Atlas"),(21,"Grand Café de la Poste"),(22,"Pétanque Social Club"),(23,"Thirty5ive")]),
  ("shop",[(24,"33 Rue Majorelle"),(25,"Atelier 44"),(26,"Fadila El Gadi"),(27,"Galerie des Tanneurs"),(28,"Lalla"),(29,"Norya Ayron"),(30,"Yahya")]),
 ]},
}

# ---- Lieux hors légende (repères signalés sur les cartes ou utiles au jeu) ----
EXTRA = [
 ("t1-x-place","t1","Place Jemaa el-Fna"),
 ("t1-x-koutoubia","t1","Mosquée de la Koutoubia"),
 ("t2-x-mouassine","t2","Mosquée et fontaine Mouassine"),
 ("t3-x-debbagh","t3","Bab Debbagh et les tanneries"),
 ("t4-x-agnaou","t4","Bab Agnaou"),
 ("t5-x-mosquee","t5","Mosquée Bab Doukkala"),
 ("t5-x-belabbes","t5","Zaouïa de Sidi Bel Abbès"),
 ("t6-x-martyrs","t6","Église des Saints-Martyrs"),
]

# ---- Positions sourcées ("v") ou approximatives ("a") ----
POS = {
 "t1-x-place": (31.62583,-7.98944,"v","Wikipedia « Jemaa el-Fnaa »"),
 "t1-x-koutoubia": (31.624124,-7.993541,"v","Wikipedia « Kutubiyya Mosque »"),
 "t1-01": (31.62333,-7.983806,"v","Wikipedia « Dar Si Said »"),
 "t1-03": (31.6222,-7.9840,"v","Around Us / Wikidata « Tiskiwin Museum »"),
 "t2-x-mouassine": (31.62944,-7.98944,"v","Wikipedia « Mouassine Mosque »"),
 "t2-05": (31.6309,-7.9901,"v","Around Us / Wikidata « Le Jardin Secret »"),
 "t2-08": (31.631573,-7.992403,"v","Wikipedia « Dar el Bacha »"),
 "t2-09": (31.6288,-7.9872,"i","estimation (place Rahba Kedima)"),
 "t3-01": (31.63194,-7.986194,"v","Wikipedia « Ben Youssef Madrasa »"),
 "t3-03": (31.6315,-7.9872,"v","Wikipedia « Almoravid Qubba »"),
 "t3-05": (31.6312,-7.9868,"v","Wikipedia « Marrakech Museum »"),
 "t3-02": (31.6324,-7.9863,"i","estimation : juste au nord de la médersa (carte du guide)"),
 "t3-x-debbagh": (31.6336,-7.9769,"i","estimation (porte Bab Debbagh)"),
 "t4-01": (31.6183,-7.9858,"v","Wikipedia « El Badi Palace »"),
 "t4-02": (31.6215917,-7.9822306,"v","Wikipedia « Bahia Palace » (centre du palais)"),
 "t4-03": (31.620111,-7.982333,"v","Wikipedia « Slat al-Azama Synagogue »"),
 "t4-08": (31.6173,-7.988702,"v","Wikipedia « Saadian Tombs »"),
 "t4-x-agnaou": (31.6175,-7.9907,"v","Wikipedia « Bab Agnaou »"),
 "t4-05": (31.6178,-7.9889,"i","estimation : contre les tombeaux saadiens, côté nord"),
 "t4-07": (31.6200,-7.9844,"i","estimation d'après la carte du guide"),
 "t4-04": (31.6199,-7.9799,"i","estimation d'après la carte du guide"),
 "t5-01": (31.633944,-7.999000,"v","Wikipedia « Bab Doukkala »"),
 "t5-02": (31.633500,-7.987694,"v","Wikipedia « Shrob ou Shouf Fountain »"),
 "t5-x-mosquee": (31.63111,-7.995750,"v","Wikipedia « Bab Doukkala Mosque »"),
 "t5-x-belabbes": (31.6375,-7.9900,"i","estimation (zaouïa de Sidi Bel Abbès)"),
 "t6-02": (31.64278,-8.00306,"v","Wikipedia « Majorelle Garden »"),
}
SAME = {"t1-04": "t4-02"}   # même lieu présent sur deux cartes du guide

# ---- Géoréférencement de la carte papier du territoire I (photo p. 75) ----
# pixels (x, y) des pastilles numérotées relevés sur la photo ; recalage par similitude sur des points connus
T1_PX = {1:(1329,1253),2:(322,818),3:(1306,1483),4:(1327,1789),5:(1261,1567),6:(345,765),7:(762,1044),8:(398,1236),9:(1264,1120),10:(1238,623),
 11:(1288,944),12:(354,485),13:(1199,1173),14:(907,632),15:(614,425),16:(110,672),17:(356,565),18:(1196,1298),19:(288,447),20:(1104,1065),
 21:(690,1087),22:(630,375),23:(1096,975),24:(414,776),25:(321,1064),26:(608,751),27:(639,473),28:(674,529),29:(474,732),30:(762,936),
 31:(740,510),32:(872,662),33:(255,1337),34:(956,1780),35:(1146,1289),36:(544,417),37:(551,190)}
ANCHORS = [ ((674,529),(31.62619,-7.98762),1.0),     # Café de France
            ((1329,1253),(31.62333,-7.983806),1.0),  # Dar Si Said
            ((1306,1483),(31.6221,-7.9841),0.7),     # Musée Tiskiwin
            ((420,610),(31.62583,-7.98944),0.5) ]    # centre de la place
LAT0, LON0 = 31.6245, -7.9870
MLAT, MLON = 110900.0, 111320.0*math.cos(math.radians(LAT0))

def fit_similarity():
    # (E, N) = [[a, b], [-b, a]] . (x, -y) + (tx, ty)   -> inconnues a, b, tx, ty
    A, B, Wt = [], [], []
    for (px, (lat, lon), w) in ANCHORS:
        x, y = px[0], -px[1]
        E, N = (lon-LON0)*MLON, (lat-LAT0)*MLAT
        A += [[x, y, 1, 0], [y, -x, 0, 1]]; B += [E, N]; Wt += [w, w]
    A, B, Wt = np.array(A, float), np.array(B, float), np.sqrt(np.array(Wt))
    sol, *_ = np.linalg.lstsq(A*Wt[:, None], B*Wt, rcond=None)
    return sol
SOL = fit_similarity()
def px2ll(px):
    a, b, tx, ty = SOL; x, y = px[0], -px[1]
    E, N = a*x + b*y + tx, -b*x + a*y + ty
    return round(LAT0 + N/MLAT, 5), round(LON0 + E/MLON, 5)

def main():
    a, b, *_ = SOL
    print("échelle %.3f m/px, rotation %.1f°" % (math.hypot(a, b), math.degrees(math.atan2(b, a))))
    for (px, (lat, lon), w) in ANCHORS:
        la, lo = px2ll(px)
        print("  résidu ancre : %.0f m" % math.hypot((la-lat)*MLAT, (lo-lon)*MLON))
    OSM = json.load(open(os.path.join(ROOT, "tools", "osm_matches.json"), encoding="utf-8"))
    def locate(p, pid, tid, n):
        paper = None
        if tid == "t1" and n in T1_PX and pid not in SAME:
            la, lo = px2ll(T1_PX[n])
            paper = {"page": 75, "n": n, "px": list(T1_PX[n]), "est": [la, lo], "method": "similitude (échelle, rotation, translation) ajustée sur 4 repères"}
            p["paper"] = paper
        if pid in POS and POS[pid][2] == "v":
            la, lo, q, src = POS[pid]; p.update(pos=[la, lo], q="v", src=src)
        elif pid in OSM:
            la, lo, name, tag = OSM[pid]; p.update(pos=[round(la, 6), round(lo, 6)], q="v", src="OpenStreetMap, « %s » (%s)" % (name, tag))
        elif pid in POS:
            la, lo, q, src = POS[pid]; p.update(pos=[la, lo], q=q, src=src)
        elif paper:
            p.update(pos=paper["est"], q="e", src="calculée depuis la carte du guide p. 75 (écart médian constaté : 46 m)")
    places = []
    for tid, leg in LEGENDS.items():
        for cat, items in leg["items"]:
            for n, name in items:
                pid = "%s-%02d" % (tid, n)
                p = {"id": pid, "t": tid, "n": n, "cat": cat, "name": name, "page": leg["page"]}
                if pid in SAME: p["same"] = SAME[pid]
                locate(p, pid, tid, n)
                places.append(p)
    for pid, tid, name in EXTRA:
        p = {"id": pid, "t": tid, "n": None, "cat": "extra", "name": name}
        locate(p, pid, tid, None)
        places.append(p)
    json.dump(places, open(os.path.join(ROOT, "data", "places.json"), "w"), ensure_ascii=False, indent=0, separators=(",", ":"))
    from collections import Counter
    print(len(places), "lieux —", dict(Counter(p.get("q", "non positionné") for p in places if not p.get("same"))))
if __name__ == "__main__":
    main()
