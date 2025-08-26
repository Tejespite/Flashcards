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

function App() {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState({});
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [currentCollection, setCurrentCollection] = useState(DEFAULT_COLLECTIONS[0]);
  const [newCollection, setNewCollection] = useState("");
  const [learningMode, setLearningMode] = useState(false);
  const [learningIndex, setLearningIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

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
      setFlipped({});
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
  };

  const handleFlip = (id) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
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
      setFlipped(prev => {
        const newFlipped = { ...prev };
        delete newFlipped[id];
        return newFlipped;
      });
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

  // UI
  return (
    <div className="app-container">
      <h1 className="title">Flashcards</h1>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24 }}>
        <select
          className="input"
          style={{ width: 160, fontWeight: 600 }}
          value={currentCollection}
          onChange={e => setCurrentCollection(e.target.value)}
        >
          {collections.map(col => (
            <option key={col} value={col}>{col.charAt(0).toUpperCase() + col.slice(1)}</option>
          ))}
        </select>
        <input
          className="input"
          style={{ width: 140 }}
          type="text"
          value={newCollection}
          onChange={e => setNewCollection(e.target.value)}
          placeholder="New collection"
        />
        <button className="save-btn" style={{ padding: "10px 16px" }} onClick={handleAddCollection}>
          Add
        </button>
      </div>

      <div className="form-container">
        <input
          className="input"
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term"
        />
        <input
          className="input"
          type="text"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="Definition"
        />
        <button className="save-btn" onClick={save}>Save</button>
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40 }}>
          <div className="flashcard" style={{ marginBottom: 24, cursor: "default" }}>
            <div className="flashcard-inner" style={{ transform: showAnswer ? "rotateY(180deg)" : "none" }}>
              <div className="flashcard-front" style={{ backfaceVisibility: "hidden" }}>
                <span style={{ fontSize: "1.5rem" }}>{cards[learningIndex]?.term}</span>
              </div>
              <div className="flashcard-back" style={{ backfaceVisibility: "hidden", background: "#764ba2", color: "#fff" }}>
                <span style={{ fontSize: "1.5rem" }}>{cards[learningIndex]?.definition}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <button className="save-btn" onClick={prevCard} disabled={cards.length < 2}>Prev</button>
            <button className="save-btn" onClick={() => setShowAnswer(a => !a)}>
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </button>
            <button className="save-btn" onClick={nextCard} disabled={cards.length < 2}>Next</button>
          </div>
          <div style={{ color: "#fff", opacity: 0.8 }}>
            Card {learningIndex + 1} of {cards.length}
          </div>
        </div>
      ) : (
        <div className="cards-grid">
          {cards.map(card => (
            <div
              key={card.id}
              className={`flashcard${flipped[card.id] ? " flipped" : ""}`}
              onClick={() => handleFlip(card.id)}
              style={{ position: "relative" }}
            >
              <div className="flashcard-inner">
                <div className="flashcard-front">
                  {card.term}
                </div>
                <div className="flashcard-back">
                  {card.definition || <span className="no-def">No definition</span>}
                </div>
              </div>
              <button
                className="delete-btn"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "#ff4d4f",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.13)"
                }}
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
    </div>
  )
}

export default App
