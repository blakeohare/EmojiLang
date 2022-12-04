# Calculate π

This program attempts to calculate π by guessing random points in a 2x2 square. If the point is 
within the inscribed circle (which has a radius of 1), then it increments a counter.

The value of π is determined by diving the counter of circle hits by the total number of trials.

This is based off the area formula of a circle and square.

Circle area = π * radius^2
Square area = side^2

Therefore, the hits over the circle divided by total hits would be the area of the circle over the 
area of a square:

hit ratio = π * radius^2 / side^2

As the radius is 1 and the side length is 2, this gives us a hit ratio being equivalent to π / 4.
Therefore multiplying the quotient by 4 will give us an estimate of the value of π.

```
🤸‍♂️▶️🚦
  
  📢🎯⬅️0️⃣🗄️
  📢🏹⬅️0️⃣🗄️
  📢🔬⬅️9️⃣9️⃣9️⃣9️⃣9️⃣🗄️

  🎠🏹👇⚖️🔬🎱
    🤷‍♂️👉🍩🏁🎱
      📢🎯⬅️🎯➕1️⃣🗄️
    🤦‍♂️
    📢🏹⬅️🏹➕1️⃣🗄️
    📢🍰⬅️4️⃣⏺0️⃣✖️🎯➗🏹🗄️
    📦🖨️⚪🧶Pi is about: ✂️➕🍰🏁
  🐴
🙍‍♂️

🤸‍♂️🍩🚦
  📢👔⬅️📦🎲🏁✖️2️⃣➖1️⃣🗄️
  📢👗⬅️📦🎲🏁✖️2️⃣➖1️⃣🗄️
  🤷‍♂️👔⚡2️⃣➕👗⚡2️⃣👇⚖️1️⃣🎱
    🤮☂️😷
  🤦‍♂️
  🤮🌂😷
🙍‍♂️

```

In pseudo-code this translates to:

```
func main:
  
  🎯 := 0      # counter inscribed circle hits
  🏹 := 0      # counter for total number of trials
  🔬 := 99999  # the total number of trials we want to attempt

  loop 🏹 <= 🔬:
    if 🍩:
      🎯 := 🎯 + 1
    end if
    🏹 := 🏹 + 1
    🍰 := 4.0 * 🎯 / 🏹
    print("Pi is about: " + 🍰)
  end loop
end func

func 🍩:
  👔 := random() * 2 - 1    # X coordinate 
  👗 := random() * 2 - 1    # Y coordinate
  if 👔^2 + 👗^2 <= 1:
    return true
  end if
  return false
end func
```
