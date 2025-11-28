 will@will-mbp:~/Programming/ollama-python (main)
(ollama-python) > uv run main.py
Below are **four identical suites of 25 utility functions** written in Python 3, Go, JavaScript (ES‑2023), and Java.  
Each language version implements the same set of operations – the only differences are the syntax and idioms of the language.

---

## 📘 1. Python 3 (module `utils.py`)

```python
# utils.py
from math import sqrt
from typing import List, Any


def add(a: float, b: float) -> float:
    return a + b


def subtract(a: float, b: float) -> float:
    return a - b


def multiply(a: float, b: float) -> float:
    return a * b


def divide(a: float, b: float) -> float:
    if b == 0:
        raise ZeroDivisionError("division by zero")
    return a / b


def factorial(n: int) -> int:
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result


def fibonacci(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True


def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a


def lcm(a: int, b: int) -> int:
    return abs(a * b) // gcd(a, b)


def reverse_string(s: str) -> str:
    return s[::-1]


def is_palindrome(s: str) -> bool:
    cleaned = ''.join(ch.lower() for ch in s if ch.isalnum())
    return cleaned == cleaned[::-1]


def count_vowels(s: str) -> int:
    return sum(1 for ch in s.lower() if ch in "aeiou")


def sum_array(arr: List[float]) -> float:
    return sum(arr)


def max_in_array(arr: List[float]) -> float:
    return max(arr)


def min_in_array(arr: List[float]) -> float:
    return min(arr)


def average(arr: List[float]) -> float:
    return sum(arr) / len(arr) if arr else 0.0


def bubble_sort(arr: List[Any]) -> List[Any]:
    a = arr[:]
    n = len(a)
    for i in range(n):
        for j in range(0, n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a


def binary_search(arr: List[Any], target: Any) -> int:
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


def mergesort(arr: List[Any]) -> List[Any]:
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = mergesort(arr[:mid])
    right = mergesort(arr[mid:])
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    merged.extend(left[i:]); merged.extend(right[j:])
    return merged


def quicksort(arr: List[Any]) -> List[Any]:
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    less = [x for x in arr[1:] if x <= pivot]
    greater = [x for x in arr[1:] if x > pivot]
    return quicksort(less) + [pivot] + quicksort(greater)


def rotate_array(arr: List[Any], k: int) -> List[Any]:
    n = len(arr)
    k %= n
    return arr[-k:] + arr[:-k]


def flatten_matrix(matrix: List[List[Any]]) -> List[Any]:
    return [elem for row in matrix for elem in row]


def transpose_matrix(matrix: List[List[Any]]) -> List[List[Any]]:
    if not matrix:
        return []
    return [[row[i] for row in matrix] for i in range(len(matrix[0]))]


def find_missing_number(arr: List[int]) -> int:
    n = len(arr) + 1
    expected = n * (n + 1) // 2
    return expected - sum(arr)


def get_unique_elements(arr: List[Any]) -> List[Any]:
    seen = set()
    uniq = []
    for x in arr:
        if x not in seen:
            uniq.append(x)
            seen.add(x)
    return uniq
```

---





## 📘 2. Go (package `utils`)

```go
// utils/utils.go
package utils

import (
        "errors"
        "math"
        "sort"
)

// 1–4 arithmetic
func Add(a, b float64) float64                 { return a + b }
func Subtract(a, b float64) float64            { return a - b }
func Multiply(a, b float64) float64            { return a * b }
func Divide(a, b float64) (float64, error) {
        if b == 0 {
                return 0, errors.New("division by zero")
        }
        return a / b, nil
}

// 5 factorial
func Factorial(n int) int {
        if n < 0 {
                return 0
        }
        res := 1
        for i := 2; i <= n; i++ {
                res *= i
        }
        return res
}

// 6 fibonacci
func Fibonacci(n int) int {
        a, b := 0, 1
        for i := 0; i < n; i++ {
                a, b = b, a+b
        }
        return a
}

// 7 prime test
func IsPrime(n int) bool {
        if n < 2 {
                return false
        }
        limit := int(math.Sqrt(float64(n)))
        for i := 2; i <= limit; i++ {
                if n%i == 0 {
                        return false
                }
        }
        return true
}

// 8 GCD (Euclidean)
func GCD(a, b int) int {
        for b != 0 {
                a, b = b, a%b
        }
        return a
}

// 9 LCM
func LCM(a, b int) int {
        return int(math.Abs(float64(a*b))) / GCD(a, b)
}

// 10 reverse string (runes for Unicode safety)
func ReverseString(s string) string {
        runes := []rune(s)
        for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
                runes[i], runes[j] = runes[j], runes[i]
        }
        return string(runes)
}

// 11 palindrome (ignores case & non‑alphanum)
func IsPalindrome(s string) bool {
        var filtered []rune
        for _, r := range []rune(s) {
                if ('a' <= r && r <= 'z') || ('A' <= r && r <= 'Z') || ('0' <= r && r <= '9') {
                        if r >= 'A' && r <= 'Z' {
                                r += 'a' - 'A'
                        }
                        filtered = append(filtered, r)
                }
        }
        n := len(filtered)
        for i := 0; i < n/2; i++ {
                if filtered[i] != filtered[n-1-i] {
                        return false
                }
        }
        return true
}

// 12 count vowels
func CountVowels(s string) int {
        count := 0
        for _, r := range []rune(strings.ToLower(s)) {
                switch r {
                case 'a', 'e', 'i', 'o', 'u':
                        count++
                }
        }
        return count
}

// 13 sum array
func SumArray(arr []float64) float64 {
        sum := 0.0
        for _, v := range arr {
                sum += v
        }
        return sum
}

// 14 max in array
func MaxInArray(arr []float64) float64 {
        if len(arr) == 0 {
                panic("empty array")
        }
        max := arr[0]
        for _, v := range arr[1:] {
                if v > max {
                        max = v
                }
        }
        return max
}

// 15 min in array
func MinInArray(arr []float64) float64 {
        if len(arr) == 0 {
                panic("empty array")
        }
        min := arr[0]
        for _, v := range arr[1:] {
                if v < min {
                        min = v
                }
        }
        return min
}

// 16 average
func Average(arr []float64) float64 {
        if len(arr) == 0 {
                return 0
        }
        return SumArray(arr) / float64(len(arr))
}

// 17 bubble sort (returns a new slice)
func BubbleSort[T any](arr []T, less func(a, b T) bool) []T {
        sorted := make([]T, len(arr))
        copy(sorted, arr)
        n := len(sorted)
        for i := 0; i < n; i++ {
                for j := 0; j < n-i-1; j++ {
                        if less(sorted[j+1], sorted[j]) {
                                sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
                        }
                }
        }
        return sorted
}

// 18 binary search (requires sorted slice)
func BinarySearch[T any](arr []T, target T, less func(a, b T) bool) int {
        lo, hi := 0, len(arr)-1
        for lo <= hi {
                mid := (lo + hi) / 2
                if !less(arr[mid], target) && !less(target, arr[mid]) {
                        return mid
                } else if less(arr[mid], target) {
                        lo = mid + 1
                } else {
                        hi = mid - 1
                }
        }
        return -1
}

// 19 mergesort (generic)
func MergeSort[T any](arr []T, less func(a, b T) bool) []T {
        if len(arr) <= 1 {
                return arr
        }
        mid := len(arr) / 2
        left := MergeSort(arr[:mid], less)
        right := MergeSort(arr[mid:], less)
        return merge(left, right, less)
}
func merge[T any](a, b []T, less func(x, y T) bool) []T {
        res := make([]T, 0, len(a)+len(b))
        i, j := 0, 0
        for i < len(a) && j < len(b) {
                if less(a[i], b[j]) || (!less(b[j], a[i]) && !less(a[i], b[j])) {
                        res = append(res, a[i])
                        i++
                } else {
                        res = append(res, b[j])
                        j++
                }
        }
        res = append(res, a[i:]...)
        res = append(res, b[j:]...)
        return res
}

// 20 quicksort (generic, in‑place)
func QuickSort[T any](arr []T, less func(a, b T) bool) []T {
        if len(arr) <= 1 {
                return arr
        }
        pivot := arr[0]
        var lessSlice, equalSlice, greaterSlice []T
        for _, v := range arr {
                switch {
                case less(v, pivot):
                        lessSlice = append(lessSlice, v)
                case less(pivot, v):
                        greaterSlice = append(greaterSlice, v)
                default:
                        equalSlice = append(equalSlice, v)
                }
        }
        lessSlice = QuickSort(lessSlice, less)
        greaterSlice = QuickSort(greaterSlice, less)
        return append(append(lessSlice, equalSlice...), greaterSlice...)
}

// 21 rotate array k steps to the right
func RotateArray[T any](arr []T, k int) []T {
        n := len(arr)
        if n == 0 {
                return arr
        }
        k = ((k % n) + n) % n
        res := make([]T, n)
        copy(res, arr[n-k:])
        copy(res[n-k:], arr[:n-k])
        return res
}

// 22 flatten matrix
func FlattenMatrix[T any](matrix [][]T) []T {
        var flat []T
        for _, row := range matrix {
                flat = append(flat, row...)
        }
        return flat
}

// 23 transpose matrix
func TransposeMatrix[T any](matrix [][]T) [][]T {
        if len(matrix) == 0 {
                return [][]T{}
        }
        rows, cols := len(matrix), len(matrix[0])
        res := make([][]T, cols)
        for i := 0; i < cols; i++ {
                res[i] = make([]T, rows)
                for j := 0; j < rows; j++ {
                        res[i][j] = matrix[j][i]
                }
        }
        return res
}

// 24 find missing number in 1..n (array length = n-1, contains each number once)
func FindMissingNumber(arr []int) int {
        n := len(arr) + 1
        expected := n * (n + 1) / 2
        sum := 0
        for _, v := range arr {
                sum += v
        }
        return expected - sum
}

// 25 unique elements (preserves order)
func UniqueElements[T comparable](arr []T) []T {
        seen := make(map[T]struct{})
        var uniq []T
        for _, v := range arr {
                if _, ok := seen[v]; !ok {
                        seen[v] = struct{}{}
                        uniq = append(uniq, v)
                }
        }
        return uniq
}
```

**Notes**

* Generic helpers (`BubbleSort`, `BinarySearch`, `MergeSort`, `QuickSort`, `RotateArray`, `FlattenMatrix`, `TransposeMatrix`, `UniqueElements`) use Go 1.18+ type parameters.
* For the non‑generic numeric functions, `float64` is used; adapt as needed.

---

## 📘 3. JavaScript (ES‑2023) – `utils.js`

```js
/* utils.js */

/* 1‑4 arithmetic */
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
export const multiply = (a, b) => a * b;
export const divide = (a, b) => {
  if (b === 0) throw new Error('division by zero');
  return a / b;
};

/* 5 factorial */
export const factorial = n => {
  if (n < 0) return 0;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
};

/* 6 fibonacci */
export const fibonacci = n => {
  let a = 0,
    b = 1;
  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
};

/* 7 prime test */
export const isPrime = n => {
  if (n < 2) return false;
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 2; i <= limit; i++) if (n % i === 0) return false;
  return true;
};

/* 8 GCD (Euclidean) */
export const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a;
};

/* 9 LCM */
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/* 10 reverse string (Unicode safe) */
export const reverseString = s => [...s].reverse().join('');

/* 11 palindrome (case‑insensitive, ignore non‑alphanum) */
export const isPalindrome = s => {
  const cleaned = s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return cleaned === [...cleaned].reverse().join('');
};

/* 12 count vowels */
export const countVowels = s =>
  (s.match(/[aeiou]/gi) || []).length;

/* 13 sum array */
export const sumArray = arr => arr.reduce((a, b) => a + b, 0);

/* 14 max in array */
export const maxInArray = arr => Math.max(...arr);

/* 15 min in array */
export const minInArray = arr => Math.min(...arr);

/* 16 average */
export const average = arr => (arr.length ? sumArray(arr) / arr.length : 0);

/* 17 bubble sort (returns new array) */
export const bubbleSort = (arr, compare = (a, b) => a - b) => {
  const a = [...arr];
  const n = a.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (compare(a[j + 1], a[j]) < 0) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
    }
  }
  return a;
};

/* 18 binary search (sorted) */
export const binarySearch = (arr, target, compare = (a, b) => a - b) => {
  let lo = 0,
    hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cmp = compare(arr[mid], target);
    if (cmp === 0) return mid;
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
};

/* 19 mergesort */
export const mergeSort = (arr, compare = (a, b) => a - b) => {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);
  const merged = [];
  while (left.length && right.length) {
    if (compare(left[0], right[0]) <= 0) merged.push(left.shift());
    else merged.push(right.shift());
  }
  return merged.concat(left, right);
};

/* 20 quicksort (in‑place) */
export const quickSort = (arr, compare = (a, b) => a - b) => {
  const helper = (low, high) => {
    if (low >= high) return;
    const pivot = arr[high];
    let i = low;
    for (let j = low; j < high; j++) {
      if (compare(arr[j], pivot) <= 0) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        i++;
      }
    }
    [arr[i], arr[high]] = [arr[high], arr[i]];
    helper(low, i - 1);
    helper(i + 1, high);
  };
  helper(0, arr.length - 1);
  return arr;
};

/* 21 rotate array k steps right */
export const rotateArray = (arr, k) => {
  const n = arr.length;
  if (!n) return arr;
  k = ((k % n) + n) % n;
  return arr.slice(-k).concat(arr.slice(0, n - k));
};

/* 22 flatten matrix */
export const flattenMatrix = matrix => matrix.flat();

/* 23 transpose matrix */
export const transposeMatrix = matrix => {
  if (!matrix.length) return [];
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
};

/* 24 find missing number 1..n */
export const findMissingNumber = arr => {
  const n = arr.length + 1;
  const expected = (n * (n + 1)) >> 1;
  const actual = arr.reduce((a, b) => a + b, 0);
  return expected - actual;
};

/* 25 unique elements (preserve order) */
export const uniqueElements = arr => {
  const seen = new Set();
  return arr.filter(v => {
    if (seen.has(v)) return false;
    seen.add(v);
    return true;
  });
};
```

*All functions are exported as named exports.  
You can import any subset with `import { factorial, reverseString } from "./utils.js";`.*

---

## 📘 4. Java (class `Utils`) – `Utils.java`

```java
/* Utils.java */
import java.util.*;
import java.util.function.*;

public final class Utils {

    private Utils() {}   // prevent instantiation

    /* 1‑4 arithmetic */
    public static double add(double a, double b)               { return a + b; }
    public static double subtract(double a, double b)          { return a - b; }
    public static double multiply(double a, double b)          { return a * b; }
    public static double divide(double a, double b) {
        if (b == 0) throw new ArithmeticException("division by zero");
        return a / b;
    }

    /* 5 factorial */
    public static long factorial(int n) {
        if (n < 0) return 0;
        long res = 1;
        for (int i = 2; i <= n; i++) res *= i;
        return res;
    }

    /* 6 fibonacci */
    public static long fibonacci(int n) {
        long a = 0, b = 1;
        for (int i = 0; i < n; i++) {
            long tmp = a + b;
            a = b;
            b = tmp;
        }
        return a;
    }

    /* 7 prime test */
    public static boolean isPrime(int n) {
        if (n < 2) return false;
        int limit = (int) Math.sqrt(n);
        for (int i = 2; i <= limit; i++) if (n % i == 0) return false;
        return true;
    }

    /* 8 GCD (Euclidean) */
    public static int gcd(int a, int b) {
        while (b != 0) { int t = a % b; a = b; b = t; }
        return a;
    }

    /* 9 LCM */
    public static int lcm(int a, int b) {
        return Math.abs(a * b) / gcd(a, b);
    }

    /* 10 reverse string (Unicode safe) */
    public static String reverseString(String s) {
        return new StringBuilder(s).reverse().toString();
    }

    /* 11 palindrome (ignores case & non‑alphanum) */
    public static boolean isPalindrome(String s) {
        String cleaned = s.replaceAll("[^A-Za-z0-9]", "")
                          .toLowerCase();
        return cleaned.equals(new StringBuilder(cleaned).reverse().toString());
    }

    /* 12 count vowels */
    public static long countVowels(String s) {
        return s.toLowerCase().chars()
                .filter(ch -> "aeiou".indexOf(ch) >= 0)
                .count();
    }

    /* 13 sum array */
    public static double sumArray(double[] arr) {
        double sum = 0;
        for (double v : arr) sum += v;
        return sum;
    }

    /* 14 max in array */
    public static double maxInArray(double[] arr) {
        if (arr.length == 0) throw new IllegalArgumentException("empty array");
        double max = arr[0];
        for (double v : arr) if (v > max) max = v;
        return max;
    }

    /* 15 min in array */
    public static double minInArray(double[] arr) {
        if (arr.length == 0) throw new IllegalArgumentException("empty array");
        double min = arr[0];
        for (double v : arr) if (v < min) min = v;
        return min;
    }

    /* 16 average */
    public static double average(double[] arr) {
        return arr.length == 0 ? 0 : sumArray(arr) / arr.length;
    }

    /* 17 bubble sort (returns new list) */
    public static <T> List<T> bubbleSort(List<T> list,
                                         Comparator<? super T> cmp) {
        List<T> a = new ArrayList<>(list);
        int n = a.size();
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (cmp.compare(a.get(j + 1), a.get(j)) < 0) {
                    Collections.swap(a, j, j + 1);
                }
            }
        }
        return a;
    }

    /* 18 binary search (sorted) */
    public static <T> int binarySearch(List<T> list, T target,
                                       Comparator<? super T> cmp) {
        int lo = 0, hi = list.size() - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            int c = cmp.compare(list.get(mid), target);
            if (c == 0) return mid;
            if (c < 0) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }

    /* 19 mergesort */
    public static <T> List<T> mergeSort(List<T> list,
                                        Comparator<? super T> cmp) {
        if (list.size() <= 1) return new ArrayList<>(list);
        int mid = list.size() / 2;
        List<T> left = mergeSort(list.subList(0, mid), cmp);
        List<T> right = mergeSort(list.subList(mid, list.size()), cmp);
        return merge(left, right, cmp);
    }

    private static <T> List<T> merge(List<T> left, List<T> right,
                                     Comparator<? super T> cmp) {
        List<T> result = new ArrayList<>(left.size() + right.size());
        int i = 0, j = 0;
        while (i < left.size() && j < right.size()) {
            if (cmp.compare(left.get(i), right.get(j)) <= 0)
                result.add(left.get(i++));
            else
                result.add(right.get(j++));
        }
        while (i < left.size()) result.add(left.get(i++));
        while (j < right.size()) result.add(right.get(j++));
        return result;
    }

    /* 20 quicksort (in‑place) */
    public static <T> void quickSort(List<T> list,
                                     Comparator<? super T> cmp) {
        quickSortHelper(list, 0, list.size() - 1, cmp);
    }

    private static <T> void quickSortHelper(List<T> list, int lo, int hi,
                                            Comparator<? super T> cmp) {
        if (lo >= hi) return;
        T pivot = list.get(hi);
        int i = lo;
        for (int j = lo; j < hi; j++) {
            if (cmp.compare(list.get(j), pivot) <= 0) {
                Collections.swap(list, i, j);
                i++;
            }
        }
        Collections.swap(list, i, hi);
        quickSortHelper(list, lo, i - 1, cmp);
        quickSortHelper(list, i + 1, hi, cmp);
    }

    /* 21 rotate array right k steps (returns new list) */
    public static <T> List<T> rotateArray(List<T> list, int k) {
        int n = list.size();
        if (n == 0) return Collections.emptyList();
        k = ((k % n) + n) % n;
        List<T> result = new ArrayList<>(n);
        result.addAll(list.subList(n - k, n));
        result.addAll(list.subList(0, n - k));
        return result;
    }

    /* 22 flatten matrix */
    public static <T> List<T> flattenMatrix(List<List<T>> matrix) {
        List<T> flat = new ArrayList<>();
        for (List<T> row : matrix) flat.addAll(row);
        return flat;
    }

    /* 23 transpose matrix */
    public static <T> List<List<T>> transposeMatrix(List<List<T>> matrix) {
        if (matrix.isEmpty()) return Collections.emptyList();
        int rows = matrix.size();
        int cols = matrix.get(0).size();
        List<List<T>> trans = new ArrayList<>(cols);
        for (int c = 0; c < cols; c++) {
            List<T> col = new ArrayList<>(rows);
            for (int r = 0; r < rows; r++) {
                col.add(matrix.get(r).get(c));
            }
            trans.add(col);
        }
        return trans;
    }

    /* 24 find missing number from 1..n */
    public static int findMissingNumber(int[] arr) {
        int n = arr.length + 1;
        int expected = n * (n + 1) / 2;
        int sum = 0;
        for (int v : arr) sum += v;
        return expected - sum;
    }

    /* 25 unique elements (preserve order) */
    public static <T> List<T> uniqueElements(List<T> list) {
        Set<T> seen = new HashSet<>();
        List<T> uniq = new ArrayList<>();
        for (T v : list) {
            if (seen.add(v)) uniq.add(v);
        }
        return uniq;
    }
}
```

*All methods are `static` so you can call them directly, e.g.*  

```java
double d = Utils.divide(10, 2);
List<Integer> sorted = Utils.bubbleSort(Arrays.asList(5,2,9,1), Integer::compare);
```