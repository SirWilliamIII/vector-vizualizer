# **🟩** **THE 4 MOST IMPORTANT SWAY KEYBINDINGS** 

## **1️⃣**  **Open terminal**

```
SUPER + Enter
```

## **2️⃣** **Launch application launcher (menu)**

**This is your “Start menu”:**

```
SUPER + d
```

In openSUSE, this runs **wofi** (Wayland rofi replacement).

Type:

-   firefox
-   alacritty
-   dolphin
-   whatever

Hit enter → launches.

------



# **🟦** **WINDOW SPLITS (HORIZONTAL / VERTICAL)**



## **Vertical split**

This means windows stack **side-by-side**.

```
SUPER + v
```

Then open something (SUPER+Enter or SUPER+d → pick app). 

## **Horizontal split**

This means windows stack **top-to-bottom**.

```
SUPER + h
```

Then open something.

------



# **🟨** **MOVING BETWEEN WINDOWS**

```
SUPER + Left
SUPER + Right
SUPER + Up
SUPER + Down
```

Or Vim-style if configured:

```
SUPER + j
SUPER + k
SUPER + h
SUPER + l
```

------



# **🟧** **TILING VS FLOATING** 

Toggle floating:

```
SUPER + Shift + Space
```

Move floating window with mouse:

```
SUPER + Left-click drag
```

Resize with mouse:

```
SUPER + Right-click drag
```

------



# **🟥****RESIZE WINDOWS WITH KEYBOARD** 

```
SUPER + r
```

Now use arrow keys or hjkl to resize.

Exit resize mode with Escape.

------



# **🟪** **CLOSE WINDOW** 

```
SUPER + Shift + q
```

------



# **🟦**  **HELP / REFERENCE**

Sway doesn’t have a built-in help menu, but you can open:

### **1. The default config (your best reference)**



```
vim ~/.config/sway/config
```

Press /bindsym in vim to search for keybinds.

### **2. Man page**

```
man sway
man sway-input
man sway-output
```

### **3. i3 documentation (identical keys)**

https://i3wm.org/docs/userguide.html

------



# **⭐ QUICK SANE WORKFLOW**

### **Open terminal**

SUPER + Enter

### **Split vertically (left/right)**

SUPER + v

### **Split horizontally (top/bottom)**

SUPER + h

### **Switch focus**

SUPER + arrow keys

### **Launch program**

SUPER + d

### **Close window**

SUPER + Shift + q

### **Resize window**

SUPER + r → arrows

### **Kill Sway / log out**

SUPER + Shift + e



------



If you want, I can:

-   Write you a **clean opinionated Sway config**
-   Add Mac-like keybindings
-   Install a beautiful Waybar
-   Add gaps/padding (Hyprland vibes)
-   Add wallpaper + lockscreen
-   Create a “dev-focused” setup (terminal, VSCode, docker integration)

Just say your vibe.