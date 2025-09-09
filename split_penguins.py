import pandas as pd
from sklearn.model_selection import train_test_split

# Load the penguins dataset
penguins = pd.read_csv('penguins.csv')

# Drop rows with missing values for a clean split (optional, but common for ML)
penguins_clean = penguins.dropna()

# Split the data: 30 for test, rest for train
train, test = train_test_split(penguins_clean, test_size=30, random_state=42)

# Save to CSV files
train.to_csv('penguins_train.csv', index=False)
test.to_csv('penguins_test.csv', index=False)

print(f"Training set size: {len(train)}")
print(f"Test set size: {len(test)}")
