---
layout: post
title: "Converting between custom dataclasses and numpy arrays"
---
`TL;DR`: Implement `__array__()`, `__len__()` and `__getitem__()` methods on your `dataclass`.
See [the final section](#the-real-solution) for a working example.

I have gotten increasingly interested in python [typehints](https://docs.python.org/3/library/typing.html),
and in a recent project I'm creating a lot of custom types to create interfaces for different modules in my application.
I usually try to keep the types as standardlib python types, but the `dataclass` can be pretty neat.

Here is an example of a simple custom dataclass

```python
from dataclasses import dataclass
@dataclass
class Point2D:
    x: float
    y: float
```

If I want a simple way to convert this to a `numpy` array, I run into a few stumbling blocks:

## Converting one instance to a np.array (the naive way)

```python
import numpy as np

p = Point2D(x=0.2, y=3.0)
arr = np.array(p)
print(arr, type(arr), arr.dtype)
# Point2D(x=0.2, y=3.0) <class 'numpy.ndarray'> object
```

I don't get the _values_ from `Point2D`, I just get an array with the object inside.
However, we can implement an `__array__` method on `Point2D` that will allow numpy to produce an array with the correct dtype.

```python
@dataclass
class Point2D:
    ...
    def __array__(self):
        return np.array([self.x, self.y])
```

Now we get a much more sensible result when converting

```python
p = Point2D(x=0.2, y=3.0)
arr = np.array(p)
print(arr, type(arr), arr.dtype)
# [0.2 3. ] <class 'numpy.ndarray'> float64
```

The trouble comes when we want to make a new custom type that inherits from `Point2D`.

## Inheriting the `__array__` method

Let's make a simple extension of `Point2D` to 3 dimensions

```python
@dataclass
class Point3D(Point2D):
    z: float
```

If we try to convert this into a numpy array, we run into trouble

```python
p = Point3D(x=0.2, y=3.0, z=-1.0)
arr = np.array(p)
print(arr, type(arr), arr.dtype)
# [0.2 3. ] <class 'numpy.ndarray'> float64
```

We are missing the new z dimension!

One fix is to make a new `__array__` method.

```python
@dataclass
class Point3D(Point2D):
    ...
    def __array__(self):
        return np.array([self.x, self.y, self.z])
```

That will definitely work, but it breaks the [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) principle.
Instead, we can make use of [`dataclasses.astuple`](https://docs.python.org/3/library/dataclasses.html#dataclasses.astuple)

```python
from dataclasses import astuple

@dataclass
class Point2D:
    x: float
    y: float
    def __array__(self):
        return np.array(astuple(self))

@dataclass
class Point3D(Point2D):
    z: float

p = Point3D(x=0.2, y=3.0, z=-1.0)
arr = np.array(p)
print(arr, type(arr), arr.dtype)
# [ 0.2  3.  -1. ] <class 'numpy.ndarray'> float64
```

Less repetition and less chance of mistakes. Nice.

Our next issue is when dealing with more than one instance of these custom classes at a time.

## Converting lists of custom dataclasses with nested conversion

If I have a few `Point`s, I might want a 2D np.array with all the values. The naive approach would be to do

```python
p1 = Point3D(1, 2, 3)
p2 = Point3D(4, 5, 6)
list_of_points = [p1, p2] 
arr = np.array(list_of_points)
print(arr, type(arr), arr.dtype, arr.shape)
# [Point3D(x=1, y=2, z=3) Point3D(x=4, y=5, z=6)] <class 'numpy.ndarray'> object (2,)
```

Not only do I not get what I expected, I even get a bunch of warnings from numpy that this is a no-go

```text
<input>:3: FutureWarning: The input object of type 'Point3D' is an array-like implementing one of the corresponding protocols (`__array__`, `__array_interface__` or `__array_struct__`); but not a sequence (or 0-D). In the future, this object will be coerced as if it was first converted using `np.array(obj)`. To retain the old behaviour, you have to either modify the type 'Point3D', or assign to an empty array created with `np.empty(correct_shape, dtype=object)`.
<input>:3: VisibleDeprecationWarning: Creating an ndarray from ragged nested sequences (which is a list-or-tuple of lists-or-tuples-or ndarrays with different lengths or shapes) is deprecated. If you meant to do this, you must specify 'dtype=object' when creating the ndarray.
```

We already know we can get a numpy array from a single instance, so we can get around this hurdle with a simple list comprehension

```python
arr = np.array([np.array(p) for p in list_of_points])
print(arr, type(arr), arr.dtype, arr.shape)
# [[1 2 3]
# [4 5 6]] <class 'numpy.ndarray'> int32 (2, 3)
```

That works, but it feels more like a workaround than a real solution. Should I really have to remember to do this nested conversion every time I want to get my data in a 2D matrix?

No, if I just implement two additional methods on the base class, I don't have to think about this any more.

## Converting lists of custom dataclasses with `__len__` and `__getitem__` {#the-real-solution}

```python
from dataclasses import dataclass, astuple
import numpy as np

@dataclass
class Point2D:
    x: float
    y: float
    
    def __array__(self):
        return np.array(astuple(self))

    def __len__(self):
        return astuple(self).__len__()

    def __getitem__(self, item):
        return astuple(self).__getitem__(item)

@dataclass
class Point3D(Point2D):
    z: float

p1 = Point3D(1, 2, 3)
p2 = Point3D(4, 5, 6)
list_of_points = [p1, p2] 
arr = np.array(list_of_points)
print(arr, type(arr), arr.dtype, arr.shape)
# [[1 2 3]
# [4 5 6]] <class 'numpy.ndarray'> int32 (2, 3)
```

We are again abusing `dataclass.astuple` to let us access each class variable programatically, in order.

To be honest, I don't really understand why `__array__` does not work for lists of custom dataclasses,
but `__len__` and `__getitem__` does.
If numpy is looping through each element one at a time to add it to an array,
we might run into some performance issues at some point.  

But, for now, this looks fairly clean for my taste and it is very practical.
