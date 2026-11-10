import { useState,useEffect } from "react";

function CounterDemo() {

    useEffect(() => {
        console.log("Dashboard Loaded");
    }, []);

    const [count, setCount] = useState(0);

    function increase() {
        console.log('increase functin called');
        setCount(count + 1);
        setCount(count + 1);
    }

    return (
        <div>
            <h2>Count : {count}</h2>

            <button onClick={increase}>
                Increase
            </button>
        </div>
    );
}

export default CounterDemo;