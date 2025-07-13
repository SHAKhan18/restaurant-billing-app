// Restaurant Billing App with Firebase Integration and Working Login/Logout UI

import React, { useState, useEffect } from "react";
import html2pdf from "html2pdf.js";
import { motion } from "framer-motion";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const BillingPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [restaurantNameInput, setRestaurantNameInput] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountMode, setDiscountMode] = useState("rupees");
  const [gstRate, setGstRate] = useState(0);
  const [roundOff, setRoundOff] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [waiterName, setWaiterName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [finalTotal, setFinalTotal] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAuthenticated(false);
      setRestaurantName("");
      setEmail("");
      setPassword("");
      setOwnerName("");
      setOwnerPhone("");
      setRestaurantNameInput("");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAddNewItem = async () => {
    const newItem = {
      id: Date.now(),
      name: newItemName,
      price: Number(newItemPrice),
    };
    const updatedMenu = [...menu, newItem];
    setMenu(updatedMenu);
    setNewItemName("");
    setNewItemPrice("");

    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "restaurants", user.uid);
        await updateDoc(docRef, { menu: updatedMenu });
      }
    } catch (error) {
      console.error("Failed to save menu:", error);
      alert("Failed to save menu to Firestore.");
    }
  };

  const addToCart = (item) => {
  const existingIndex = cart.findIndex((i) => i.id === item.id);
  if (existingIndex !== -1) {
    const updatedCart = [...cart];
    updatedCart[existingIndex].quantity += 1;
    setCart(updatedCart);
  } else {
    setCart([...cart, { ...item, quantity: 1 }]); // quantity added here ✅
  }
};

  const decrementFromCart = (id) => {
    const existingIndex = cart.findIndex((item) => item.id === id);
    if (existingIndex !== -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity > 1) {
        updatedCart[existingIndex].quantity -= 1;
      } else {
        updatedCart.splice(existingIndex, 1);
      }
      setCart(updatedCart);
    }
  };

  const removeFromMenu = async (id) => {
    const updatedMenu = menu.filter((item) => item.id !== id);
    setMenu(updatedMenu);

    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "restaurants", user.uid);
        await updateDoc(docRef, { menu: updatedMenu });
      }
    } catch (error) {
      console.error("Failed to update menu:", error);
      alert("Failed to update menu in Firestore.");
    }
  };

  const saveOrderToHistory = async () => {
    const newOrder = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      tableNumber,
      waiterName,
      items: cart,
      total: finalTotal,
    };
    const updatedHistory = [newOrder, ...orderHistory];
    setOrderHistory(updatedHistory);
    setCart([]);
    setTableNumber("");
    setWaiterName("");

    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "restaurants", user.uid);
        await updateDoc(docRef, { orderHistory: updatedHistory });
      }
    } catch (error) {
      console.error("Failed to save order:", error);
      alert("Failed to update order history.");
    }
  };

  const handleExportPDF = () => {
    const element = document.querySelector(".invoice-section");
    html2pdf().from(element).save("invoice.pdf");
  };

  const reuseOrder = (order) => {
    setCart(order.items);
    setTableNumber(order.tableNumber);
    setWaiterName(order.waiterName);
  };

  const deleteOrderFromHistory = (id) => {
    setOrderHistory(orderHistory.filter((o) => o.id !== id));
  };

  const exportOrderPDF = (order) => {
    const content = `Invoice - ${order.date}\nTable: ${order.tableNumber}\nWaiter: ${order.waiterName}\nTotal: ₹${order.total.toFixed(2)}`;
    const opt = { margin: 1, filename: `Order-${order.id}.pdf`, html2canvas: {}, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().from(content).set(opt).save();
  };

  const handleRegister = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "restaurants", uid), {
        restaurantName: restaurantNameInput,
        ownerName,
        ownerPhone,
        menu: [],
        orderHistory: [],
      });
      alert("Registration successful! You can now login.");
      setIsRegistering(false);
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthenticated(true);
        const docSnap = await getDoc(doc(db, "restaurants", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRestaurantName(data.restaurantName);
          setMenu(data.menu || []);
          setOrderHistory(data.orderHistory || []);
        }
      } else {
        setAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
  const subtotal = cart.reduce((acc, item) => {
    const quantity = Number(item.quantity ?? 1);
    const price = Number(item.price ?? 0);
    return acc + price * quantity;
  }, 0);

  let discount = 0;
  if (discountMode === "percentage") {
    discount = subtotal * (Number(discountValue) / 100);
  } else {
    discount = Number(discountValue);
  }

  const gstAmount = (subtotal - discount) * (Number(gstRate) / 100);
  let total = subtotal - discount + gstAmount;

  if (roundOff) {
    total = Math.round(total);
  }

  setFinalTotal(total);
}, [cart, discountMode, discountValue, gstRate, roundOff]);


    if (!authenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-yellow-100 to-orange-100">
        <motion.div
          className="bg-white p-6 rounded-2xl shadow-xl w-80"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold text-center mb-4 text-orange-600">
            {isRegistering ? "Register Restaurant" : "Restaurant Login"}
          </h2>
          {isRegistering && (
            <>
              <input className="w-full px-3 py-2 border border-gray-300 rounded-2xl mb-3" placeholder="Restaurant Name" value={restaurantNameInput} onChange={(e) => setRestaurantNameInput(e.target.value)} />
              <input className="w-full px-3 py-2 border border-gray-300 rounded-2xl mb-3" placeholder="Owner Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              <input className="w-full px-3 py-2 border border-gray-300 rounded-2xl mb-3" placeholder="Owner Phone Number" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
            </>
          )}
          <input className="w-full px-3 py-2 border border-gray-300 rounded-2xl mb-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="relative">
            <input className="w-full px-3 py-2 border border-gray-300 rounded-2xl mb-3 pr-10" placeholder="Password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="absolute right-3 top-2.5 text-gray-600 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "🙈" : "👁️"}</span>
          </div>
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-2xl mb-2" onClick={isRegistering ? handleRegister : handleLogin}>
            {isRegistering ? "Register" : "Login"}
          </button>
          <p className="text-sm text-center text-blue-600 cursor-pointer" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Already have an account? Login" : "New restaurant? Register here"}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100">
      {/* Top bar with centered name and top-right logout */}
      <div className="flex justify-between items-center px-4 pt-4 relative">
        <div className="absolute left-0 right-0 text-center">
          <h1 className="text-2xl font-bold text-orange-600">
            {restaurantName} Billing Dashboard
          </h1>
        </div>
        <div className="ml-auto">
          <button
  onClick={handleLogout}
  className="z-50 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-2xl relative"
>
  Logout
</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="grid grid-cols-5 gap-4 flex-grow min-h-[calc(100vh-150px)]">
          {/* Left Side: Menu and Order History */}
          <div className="col-span-4 grid grid-rows-2 gap-4">
            <div className="bg-white bg-opacity-70 backdrop-blur-md p-4 rounded-2xl shadow overflow-auto">
              <h2 className="text-lg font-semibold text-orange-600 mb-2">Menu</h2>
              <div className="flex gap-2 mb-2">
                <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="border px-2 py-1 rounded-2xl w-1/2" placeholder="Item name" />
                <input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="border px-2 py-1 rounded-2xl w-1/2" placeholder="Price" />
                <button onClick={handleAddNewItem} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded-2xl">Add</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {menu.map((item) => (
                  <div key={item.id} className="border p-2 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">₹{item.price}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addToCart(item)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-2xl">➕</button>
                      <button onClick={() => removeFromMenu(item.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-2xl">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white bg-opacity-70 backdrop-blur-md p-4 rounded-2xl shadow overflow-auto">
              <h2 className="text-lg font-semibold text-orange-600 mb-2">Billing History</h2>
              {orderHistory.length === 0 ? (
                <p className="text-gray-600">No orders yet.</p>
              ) : (
                <ul className="space-y-2">
                  {orderHistory.map((order) => (
                    <li key={order.id} className="border p-2 rounded-2xl">
                      <p><strong>Date:</strong> {order.date}</p>
                      <p><strong>Table:</strong> {order.tableNumber}, <strong>Waiter:</strong> {order.waiterName}</p>
                      <p><strong>Total:</strong> ₹{order.total.toFixed(2)}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => reuseOrder(order)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-2xl">Reuse</button>
                        <button onClick={() => deleteOrderFromHistory(order.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-2xl">Delete</button>
                        <button onClick={() => exportOrderPDF(order)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-2xl">PDF</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Side: Billing (20%) */}
          <div className="col-span-1 bg-white bg-opacity-70 backdrop-blur-md p-4 rounded-2xl shadow flex flex-col justify-between min-h-full">
            <div className="overflow-auto">
              <h2 className="text-lg font-semibold text-orange-600 mb-2">Billing</h2>
              {cart.length === 0 ? (
                <p className="text-gray-500">No items in cart.</p>
              ) : (
                <ul className="space-y-2">
                  {cart.map((item) => (
  <li key={item.id} className="flex justify-between items-center border-b pb-1">
    <span>{item.name} × {item.quantity}</span>
    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
    <div className="flex gap-1">
      <button
        onClick={() => decrementFromCart(item.id)}
        className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-2xl"
      >
        ➖
      </button>
      <button
        onClick={() => addToCart(item)}
        className="bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded-2xl"
      >
        ➕
      </button>
    </div>
  </li>
))}

                </ul>
              )}
              <div className="mt-4 space-y-2">
                <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Table Number" className="w-full px-3 py-1 border rounded-2xl" />
                <input value={waiterName} onChange={(e) => setWaiterName(e.target.value)} placeholder="Waiter Name" className="w-full px-3 py-1 border rounded-2xl" />
                <select value={discountMode} onChange={(e) => setDiscountMode(e.target.value)} className="w-full px-3 py-1 border rounded-2xl">
                  <option value="percentage">Discount %</option>
                  <option value="amount">Flat ₹</option>
                </select>
                <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="Discount Value" className="w-full px-3 py-1 border rounded-2xl" />
                <input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} placeholder="GST Rate (%)" className="w-full px-3 py-1 border rounded-2xl" />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={roundOff} onChange={() => setRoundOff(!roundOff)} />
                  <span className="text-sm">Round Off</span>
                </label>
                <div className="text-xl font-semibold text-orange-600 text-center">
                  Total: ₹{finalTotal.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <button onClick={saveOrderToHistory} className="bg-green-500 hover:bg-green-600 text-white w-full py-2 rounded-2xl">Save Order</button>
              <button onClick={handleExportPDF} className="bg-orange-500 hover:bg-orange-600 text-white w-full py-2 rounded-2xl">Export PDF</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;

