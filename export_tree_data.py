import pandas as pd
from sklearn.tree import DecisionTreeClassifier, export_text
import json

# Load the training and test sets
train = pd.read_csv('penguins_train.csv')
test = pd.read_csv('penguins_test.csv')

# Features and target
features = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g']
target = 'species'

# Encode species as numbers for the classifier
species_map = {'Adelie': 0, 'Chinstrap': 1, 'Gentoo': 2}
inv_species_map = {v: k for k, v in species_map.items()}
train = train[train[target].isin(species_map)]
test = test[test[target].isin(species_map)]
train['species_num'] = train[target].map(species_map)
test['species_num'] = test[target].map(species_map)

# Train the decision tree
clf = DecisionTreeClassifier(max_leaf_nodes=3, random_state=42)
clf.fit(train[features], train['species_num'])

# Predict test set
test['pred'] = clf.predict(test[features])

# Export tree structure as text (for visualization)
tree_text = export_text(clf, feature_names=features)

# Export the tree structure as a dict for JS
from sklearn.tree import _tree

def tree_to_dict(tree, feature_names):
    tree_ = tree.tree_
    feature_name = [
        feature_names[i] if i != _tree.TREE_UNDEFINED else "undefined!"
        for i in tree_.feature
    ]
    def recurse(node):
        if tree_.feature[node] != _tree.TREE_UNDEFINED:
            return {
                'feature': feature_name[node],
                'threshold': tree_.threshold[node],
                'left': recurse(tree_.children_left[node]),
                'right': recurse(tree_.children_right[node]),
                'is_leaf': False
            }
        else:
            # leaf node
            value = tree_.value[node][0]
            pred = int(value.argmax())
            return {
                'is_leaf': True,
                'pred': pred
            }
    return recurse(0)

tree_dict = tree_to_dict(clf, features)

# Prepare test set balls for JS
balls = []
for _, row in test.iterrows():
    balls.append({
        'features': [row[f] for f in features],
        'true_species': int(row['species_num']),
        'pred_species': int(row['pred'])
    })

# Save to JSON
with open('tree_data.json', 'w') as f:
    json.dump({'tree': tree_dict, 'balls': balls, 'species_map': inv_species_map}, f, indent=2)

print('tree_data.json created.')
