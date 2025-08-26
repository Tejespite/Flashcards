import { useState, useEffect } from 'react'
import './App.css'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTIONS_DOC_ID = "collections";
const COLLECTIONS_DOC_PATH = "datas";
const DEFAULT_COLLECTIONS = ["english", "german", "latin", "italian"];

// Helper: get language code from collection name
const getLangCode = (col) => {
  switch (col) {
    case "german": return "de";
    case "latin": return "la";
    case "italian": return "it";
    case "english":
    default: return "en-US";
  }
};

function App() {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [cards, setCards] = useState([]);
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [currentCollection, setCurrentCollection] = useState(DEFAULT_COLLECTIONS[0]);
  const [newCollection, setNewCollection] = useState("");
  const [learningMode, setLearningMode] = useState(false);
  const [learningIndex, setLearningIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState("");

  // Fetch collections list from Firestore
  useEffect(() => {
    const fetchCollections = async () => {
      const collectionsDocRef = doc(db, COLLECTIONS_DOC_PATH, COLLECTIONS_DOC_ID);
      const collectionsSnap = await getDoc(collectionsDocRef);
      if (collectionsSnap.exists()) {
        const data = collectionsSnap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          setCollections(data.list);
          setCurrentCollection(data.list[0]);
        } else {
          await setDoc(collectionsDocRef, { list: DEFAULT_COLLECTIONS });
          setCollections(DEFAULT_COLLECTIONS);
          setCurrentCollection(DEFAULT_COLLECTIONS[0]);
        }
      } else {
        await setDoc(collectionsDocRef, { list: DEFAULT_COLLECTIONS });
        setCollections(DEFAULT_COLLECTIONS);
        setCurrentCollection(DEFAULT_COLLECTIONS[0]);
      }
    };
    fetchCollections();
    // eslint-disable-next-line
  }, []);

  // Fetch cards from Firestore for the current collection
  useEffect(() => {
    if (!currentCollection) return;
    const fetchCards = async () => {
      const querySnapshot = await getDocs(collection(db, currentCollection));
      const fetchedCards = [];
      querySnapshot.forEach((doc) => {
        fetchedCards.push({ id: doc.id, ...doc.data() });
      });
      setCards(fetchedCards);
      setLearningIndex(0);
      setShowAnswer(false);
    };
    fetchCards();
  }, [currentCollection]);

  const save = async () => {
    if (!term.trim() || !definition.trim()) return;
    try {
      const docRef = await addDoc(collection(db, currentCollection), {
        term,
        definition
      });
      setCards([...cards, { id: docRef.id, term, definition }]);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
    setTerm("");
    setDefinition("");
    setSearchResult("");
  };

  const handleAddCollection = async () => {
    const name = newCollection.trim().toLowerCase();
    if (!name || collections.includes(name)) return;
    const collectionsDocRef = doc(db, COLLECTIONS_DOC_PATH, COLLECTIONS_DOC_ID);
    try {
      await updateDoc(collectionsDocRef, {
        list: arrayUnion(name)
      });
      setCollections([...collections, name]);
      setCurrentCollection(name);
      setNewCollection("");
    } catch (e) {
      await setDoc(collectionsDocRef, { list: [...collections, name] });
      setCollections([...collections, name]);
      setCurrentCollection(name);
      setNewCollection("");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, currentCollection, id));
      setCards(cards.filter(card => card.id !== id));
    } catch (e) {
      console.error("Error deleting card: ", e);
    }
  };

  // Learning mode handlers
  const startLearning = () => {
    setLearningMode(true);
    setLearningIndex(0);
    setShowAnswer(false);
  };

  const stopLearning = () => {
    setLearningMode(false);
    setLearningIndex(0);
    setShowAnswer(false);
  };

  const nextCard = () => {
    setShowAnswer(false);
    setLearningIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setShowAnswer(false);
    setLearningIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  // Translation search function
  const handleSearchDefinition = async () => {
    setSearching(true);
    setSearchResult("");
    try {
      const targetLang = getLangCode(currentCollection);

      const response = await fetch("http://localhost:3001/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: term,
          targetLang: "en-US",
          sourceLang: targetLang
        })
      });
      const data = await response.json();
      setSearchResult(data.translation || "No result");
    } catch (e) {
      setSearchResult("Error fetching translation.");
    }
    setSearching(false);
  };

  // UI
  return (
    <div className="app-container">
      <h1 className="title">Flashcards</h1>
      <div className="main-content">
        <aside className="collections-sidebar">
          <div className="collections-title">Collections</div>
          <select
            className="input"
            value={currentCollection}
            onChange={e => setCurrentCollection(e.target.value)}
            size={collections.length > 6 ? 6 : collections.length}
            style={{ width: "100%", marginBottom: 10, fontWeight: 600, cursor: "pointer" }}
          >
            {collections.map(col => (
              <option key={col} value={col}>{col.charAt(0).toUpperCase() + col.slice(1)}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              className="input"
              style={{ width: 0, flex: 1 }}
              type="text"
              value={newCollection}
              onChange={e => setNewCollection(e.target.value)}
              placeholder="New collection"
            />
            <button className="save-btn" style={{ padding: "8px 12px" }} onClick={handleAddCollection}>
              +
            </button>
          </div>
        </aside>
        <section className="main-section">
          <div className="form-container">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <input
                className="input"
                type="text"
                value={term}
                onChange={e => {
                  setTerm(e.target.value);
                  setSearchResult("");
                }}
                placeholder="Term"
              />
              {searchResult && (
                <div style={{
                  color: "#764ba2",
                  background: "#f3eaff",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: "1rem",
                  marginBottom: 2,
                  marginTop: -2,
                  minHeight: 24
                }}>
                  {searchResult}
                </div>
              )}
              <input
                className="input"
                type="text"
                value={definition}
                onChange={e => setDefinition(e.target.value)}
                placeholder="Definition"
              />
            </div>
            {term && !definition ? (
              <button
                className="save-btn"
                style={{ minWidth: 120 }}
                onClick={handleSearchDefinition}
                disabled={searching}
              >
                {searching ? "Searching..." : "Search"}
              </button>
            ) : (
              <button className="save-btn" onClick={save}>Save</button>
            )}
            <button
              className="save-btn"
              style={{
                background: learningMode ? "#764ba2" : "#fff",
                color: learningMode ? "#fff" : "#764ba2",
                marginLeft: 12
              }}
              onClick={learningMode ? stopLearning : startLearning}
              disabled={cards.length === 0}
            >
              {learningMode ? "Stop Learning" : "Start Learning"}
            </button>
          </div>
          {learningMode ? (
            <div className="learning-mode-container">
              <div className="learning-flashcard" title="Click to show answer" onClick={() => setShowAnswer(a => !a)}>
                <div className="learning-flashcard-inner">
                  <div
                    className="learning-flashcard-front"
                    style={{
                      background: showAnswer
                        ? "linear-gradient(120deg, #764ba2 60%, #667eea 100%)"
                        : "linear-gradient(120deg, #fff 60%, #e0c3fc 100%)",
                      color: showAnswer ? "#fff" : "#764ba2"
                    }}
                  >
                    <span>
                      {showAnswer
                        ? cards[learningIndex]?.definition
                        : cards[learningIndex]?.term}
                    </span>
                  </div>
                </div>
              </div>
              <div className="learning-controls">
                <button className="save-btn" onClick={prevCard} disabled={cards.length < 2}>Prev</button>
                <button className="save-btn" onClick={() => setShowAnswer(a => !a)}>
                  {showAnswer ? "Hide Answer" : "Show Answer"}
                </button>
                <button className="save-btn" onClick={nextCard} disabled={cards.length < 2}>Next</button>
              </div>
              <div className="learning-progress">
                Card {learningIndex + 1} of {cards.length}
              </div>
              <div style={{ color: "#fff", opacity: 0.7, fontSize: 13, marginTop: 8 }}>
                Click the card or "Show Answer" to toggle!
              </div>
            </div>
          ) : (
            <div className="cards-grid">
              {cards.map(card => (
                <div
                  key={card.id}
                  className="flashcard"
                  style={{ position: "relative" }}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <div style={{ fontWeight: 700, fontSize: "1.2em" }}>{card.term}</div>
                      <div style={{ marginTop: 12, color: "#764ba2", opacity: 0.8, fontWeight: 400, fontSize: "1em" }}>
                        {card.definition || <span className="no-def">No definition</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    title="Delete card"
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(card.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default App
